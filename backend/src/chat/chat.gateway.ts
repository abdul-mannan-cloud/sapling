import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service.js';
import { ConversationService, type SendMessageResult } from '../conversations/conversation.service.js';
import { VoiceService } from '../voice/voice.service.js';
import type { AuthUser } from '../auth/types.js';
import type { ThreadMessage } from '../agent/types.js';

function adminRoom() {
  return 'admin-room';
}
function patientRoom(patientId: string) {
  return `patient:${patientId}`;
}
function conversationRoom(conversationId: string) {
  return `conversation:${conversationId}`;
}

/**
 * All chat sending/receiving goes through this gateway, not REST — the
 * brief asked for sockets specifically so an admin's message into a
 * thread and the AI's reply both appear live on the other side without a
 * refresh. REST (conversation.controller.ts) still handles listing,
 * renaming and deleting threads, which aren't latency-sensitive.
 *
 * Voice (`send_voice_message`) is push-to-talk: one complete recorded
 * utterance in, transcribed, then run through the exact same
 * addPatientMessage/addClinicMessage path as text — so every agent
 * capability (handoffs, the emergency gate, create-vs-update) works
 * identically over voice with no separate implementation. Only the
 * requester's own socket gets the synthesized audio back; broadcasting
 * the transcript via the normal 'message' event is enough for anyone
 * else watching the thread.
 */
@WebSocketGateway({ cors: { origin: true } })
export class ChatGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly auth: AuthService,
    private readonly conversations: ConversationService,
    private readonly voice: VoiceService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const user = await this.auth.verifyToken(token);
      client.data.user = user;
      if (user.role === 'admin') {
        await client.join(adminRoom());
      } else {
        await client.join(patientRoom(user.patientId!));
      }
    } catch (err) {
      this.logger.error(`auth failed for ${client.id}`, err as Error);
      client.disconnect(true);
    }
  }

  private async assertAccess(conversationId: string, user: AuthUser) {
    const convo = await this.conversations.assertConversation(conversationId);
    if (user.role === 'patient' && convo.patientId !== user.patientId) {
      throw new Error("Can't access another patient's conversation");
    }
    return convo;
  }

  private broadcastConversationUpdate(conversationId: string, patientId: string, lastMessage: ThreadMessage) {
    const update = { id: conversationId, patientId, updatedAt: lastMessage.createdAt, lastMessage };
    this.server.to(adminRoom()).emit('conversation_updated', update);
    this.server.to(patientRoom(patientId)).emit('conversation_updated', update);
  }

  /** Shared tail for both text and voice sends: broadcast whatever addPatientMessage/addClinicMessage produced. */
  private broadcastResult(conversationId: string, patientId: string, senderRole: AuthUser['role'], result: SendMessageResult) {
    const room = conversationRoom(conversationId);
    if (senderRole !== 'patient') {
      this.server.to(room).emit('message', result.patientMessage);
      this.broadcastConversationUpdate(conversationId, patientId, result.patientMessage);
    }
    if (result.agentMessage) {
      this.server.to(room).emit('message', result.agentMessage);
      this.broadcastConversationUpdate(conversationId, patientId, result.agentMessage);
    }
    if (result.handoff) {
      this.server.to(adminRoom()).emit('handoff', result.handoff);
    }
  }

  @SubscribeMessage('join_conversation')
  async onJoin(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string }) {
    const user = client.data.user as AuthUser;
    try {
      await this.assertAccess(body.conversationId, user);
      await client.join(conversationRoom(body.conversationId));
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('leave_conversation')
  async onLeave(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string }) {
    await client.leave(conversationRoom(body.conversationId));
  }

  @SubscribeMessage('send_message')
  async onSend(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string; body: string }) {
    const user = client.data.user as AuthUser;
    let convo: { patientId: string };
    try {
      convo = await this.assertAccess(body.conversationId, user);
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
      return;
    }

    const room = conversationRoom(body.conversationId);

    try {
      // Server decides who the sender is from the authenticated role —
      // never trust a client-supplied sender field here.
      const result =
        user.role === 'patient'
          ? await this.conversations.addPatientMessage(body.conversationId, body.body, (stored) => {
              // Broadcast the sender's own message the instant it's saved,
              // rather than waiting for the agent (which can take seconds,
              // especially on the LLM path) — otherwise the sender's own
              // message looks stuck until the reply is ready.
              this.server.to(room).emit('message', stored);
              this.broadcastConversationUpdate(body.conversationId, convo.patientId, stored);
            })
          : await this.conversations.addClinicMessage(body.conversationId, body.body);

      this.broadcastResult(body.conversationId, convo.patientId, user.role, result);
    } catch (err) {
      this.logger.error('send_message failed', err as Error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('send_voice_message')
  async onSendVoice(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string; audio: string; mimetype: string },
  ) {
    const user = client.data.user as AuthUser;
    let convo: { patientId: string };
    try {
      convo = await this.assertAccess(body.conversationId, user);
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
      return;
    }

    if (!this.voice.isConfigured()) {
      client.emit('error', { message: 'Voice is not configured on this server (no DEEPGRAM_API_KEY) — use text instead.' });
      return;
    }

    const room = conversationRoom(body.conversationId);

    try {
      const transcript = await this.voice.transcribe(Buffer.from(body.audio, 'base64'), body.mimetype);
      if (!transcript) {
        client.emit('error', { message: "Didn't catch that — please try again." });
        return;
      }

      const result =
        user.role === 'patient'
          ? await this.conversations.addPatientMessage(
              body.conversationId,
              transcript,
              (stored) => {
                this.server.to(room).emit('message', stored);
                this.broadcastConversationUpdate(body.conversationId, convo.patientId, stored);
              },
              'voice',
            )
          : await this.conversations.addClinicMessage(body.conversationId, transcript);

      this.broadcastResult(body.conversationId, convo.patientId, user.role, result);

      if (result.agentMessage) {
        // Only the person who spoke hears the reply — everyone else
        // watching the thread already got the transcript as text above.
        const audio = await this.voice.synthesize(result.agentMessage.body);
        client.emit('voice_audio', {
          conversationId: body.conversationId,
          audioBase64: audio.toString('base64'),
          mimetype: 'audio/mpeg',
        });
      }
    } catch (err) {
      this.logger.error('send_voice_message failed', err as Error);
      client.emit('error', { message: 'Failed to process voice message' });
    }
  }
}

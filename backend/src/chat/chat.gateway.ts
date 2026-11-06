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
import { ConversationService } from '../conversations/conversation.service.js';
import type { AuthUser } from '../auth/types.js';

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
 */
@WebSocketGateway({ cors: { origin: true } })
export class ChatGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly auth: AuthService,
    private readonly conversations: ConversationService,
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

    try {
      // Server decides who the sender is from the authenticated role —
      // never trust a client-supplied sender field here.
      const result =
        user.role === 'patient'
          ? await this.conversations.addPatientMessage(body.conversationId, body.body)
          : await this.conversations.addClinicMessage(body.conversationId, body.body);

      const room = conversationRoom(body.conversationId);
      this.server.to(room).emit('message', result.patientMessage);
      if (result.agentMessage) {
        this.server.to(room).emit('message', result.agentMessage);
      }
      if (result.handoff) {
        this.server.to(adminRoom()).emit('handoff', result.handoff);
      }

      const lastMessage = result.agentMessage ?? result.patientMessage;
      const conversationUpdate = {
        id: body.conversationId,
        patientId: convo.patientId,
        updatedAt: lastMessage.createdAt,
        lastMessage,
      };
      this.server.to(adminRoom()).emit('conversation_updated', conversationUpdate);
      this.server.to(patientRoom(convo.patientId)).emit('conversation_updated', conversationUpdate);
    } catch (err) {
      this.logger.error('send_message failed', err as Error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }
}

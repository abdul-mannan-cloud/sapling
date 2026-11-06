import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PatientService } from '../patient/patient.service.js';
import { FaqService } from '../faq/faq.service.js';
import { ClockService } from '../clock/clock.service.js';
import { HandoffService } from '../handoffs/handoff.service.js';
import { AgentService } from '../agent/agent.service.js';
import type { Message } from '@prisma/client';
import type { ThreadMessage } from '../agent/types.js';
import type { HandoffRecord } from '../handoffs/handoff.types.js';

export const DEFAULT_PATIENT_ID = 'pt_001';

function toThreadMessage(row: Message): ThreadMessage {
  return {
    id: row.id,
    sender: row.sender as ThreadMessage['sender'],
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface SendMessageResult {
  patientMessage: ThreadMessage;
  agentMessage?: ThreadMessage;
  handoff?: HandoffRecord;
  mode?: 'rule' | 'llm' | 'emergency';
}

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientService: PatientService,
    private readonly faqService: FaqService,
    private readonly clock: ClockService,
    private readonly handoffs: HandoffService,
    private readonly agent: AgentService,
  ) {}

  /**
   * Serializes message-adding per conversation. Without this, two
   * messages sent in quick succession (faster than one LLM round trip)
   * can each build their agent context from a history snapshot that's
   * missing the other's not-yet-persisted reply, so the model answers
   * the same question twice or guesses at something it would have
   * already known a second later.
   */
  private readonly locks = new Map<string, Promise<unknown>>();

  private withLock<T>(conversationId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(conversationId) ?? Promise.resolve();
    const next = previous.then(fn, fn);
    this.locks.set(
      conversationId,
      next.catch(() => undefined),
    );
    return next;
  }

  async create(patientId: string, title?: string) {
    return this.prisma.conversation.create({ data: { patientId, title } });
  }

  /** `patientId` omitted means "all patients" — used by the admin's global "All Chats" tab. */
  async list(patientId?: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: patientId ? { patientId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    return conversations.map((c) => ({
      id: c.id,
      patientId: c.patientId,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      lastMessage: c.messages[0] ? toThreadMessage(c.messages[0]) : null,
    }));
  }

  async getMessages(conversationId: string): Promise<ThreadMessage[]> {
    await this.assertConversation(conversationId);
    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toThreadMessage);
  }

  async assertConversation(conversationId: string) {
    const convo = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!convo) throw new NotFoundException(`Conversation ${conversationId} not found`);
    return convo;
  }

  async rename(conversationId: string, title: string) {
    await this.assertConversation(conversationId);
    const row = await this.prisma.conversation.update({ where: { id: conversationId }, data: { title } });
    return { id: row.id, title: row.title };
  }

  /** Deletes the conversation and its messages. Handoffs it produced are untouched — they're independent staff records, not conversation-owned. */
  async remove(conversationId: string) {
    await this.assertConversation(conversationId);
    await this.prisma.conversation.delete({ where: { id: conversationId } });
  }

  /** Manual outbound message entered as "the clinic" — stored only, never routed to the agent. */
  async addClinicMessage(conversationId: string, body: string): Promise<SendMessageResult> {
    return this.withLock(conversationId, async () => {
      const convo = await this.assertConversation(conversationId);
      const row = await this.prisma.message.create({
        data: { conversationId: convo.id, sender: 'clinic', body },
      });
      return { patientMessage: toThreadMessage(row) };
    });
  }

  /** Inbound message entered as "Alex" — stored, then run through the agent, which may answer directly and/or create/update a handoff. */
  async addPatientMessage(conversationId: string, body: string): Promise<SendMessageResult> {
    return this.withLock(conversationId, () => this.addPatientMessageUnlocked(conversationId, body));
  }

  private async addPatientMessageUnlocked(conversationId: string, body: string): Promise<SendMessageResult> {
    const convo = await this.assertConversation(conversationId);

    const patientRow = await this.prisma.message.create({
      data: { conversationId: convo.id, sender: 'patient', body },
    });
    const patientMessage = toThreadMessage(patientRow);

    const historyRows = await this.prisma.message.findMany({
      where: { conversationId: convo.id },
      orderBy: { createdAt: 'asc' },
    });
    const history = historyRows.map(toThreadMessage);

    const [nowIso, nowDescription, handoffRecords] = await Promise.all([
      this.clock.getNowIso(),
      this.clock.describeNow(),
      this.handoffs.listForConversation(convo.id),
    ]);

    const result = await this.agent.handle({
      nowIso,
      nowDescription,
      patient: this.patientService.getRecord(),
      faqText: this.faqService.getFaqText(),
      openSlots: this.faqService.getOpenSlots(),
      history,
      handoffs: handoffRecords,
      currentMessage: patientMessage,
    });

    let handoff: HandoffRecord | undefined;
    if (result.handoffAction) {
      const { operation, handoffId, type, details } = result.handoffAction;
      const targetExists = handoffId && handoffRecords.some((h) => h.id === handoffId);
      if (operation === 'update' && targetExists) {
        handoff = await this.handoffs.update(handoffId!, {
          detailsPatch: details,
          appendMessageIds: [patientMessage.id],
        });
      } else {
        handoff = await this.handoffs.create({
          patientId: convo.patientId,
          conversationId: convo.id,
          type,
          details,
          messageIds: [patientMessage.id],
        });
      }
    }

    const agentRow = await this.prisma.message.create({
      data: { conversationId: convo.id, sender: 'agent', body: result.reply },
    });

    return { patientMessage, agentMessage: toThreadMessage(agentRow), handoff, mode: result.mode };
  }
}

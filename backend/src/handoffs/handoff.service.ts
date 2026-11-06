import { EventEmitter } from 'node:events';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { HandoffRequest } from '@prisma/client';
import type { HandoffRecord, HandoffStatus, HandoffType } from './handoff.types.js';
import { mergeDetails, mergeMessageIds } from './handoff.utils.js';

function toRecord(row: HandoffRequest): HandoffRecord {
  return {
    id: row.id,
    patientId: row.patientId,
    conversationId: row.conversationId,
    type: row.type as HandoffType,
    status: row.status as HandoffStatus,
    details: JSON.parse(row.details),
    messageIds: JSON.parse(row.messageIds),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * The handoff store is the "visible queue" staff act on. The agent only
 * ever creates records in `pending_staff` status and appends to them; it
 * never flips a request to resolved/cancelled or performs the underlying
 * action — that's the (optional) staff view's job.
 */
@Injectable()
export class HandoffService {
  readonly events = new EventEmitter();

  constructor(private readonly prisma: PrismaService) {}

  /** Newest-activity-first by default — a record a later message updates (e.g. the date changing) should surface before one that's just sat untouched since it was filed. */
  async list(patientId?: string): Promise<HandoffRecord[]> {
    const rows = await this.prisma.handoffRequest.findMany({
      where: patientId ? { patientId } : undefined,
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(toRecord);
  }

  /** Scopes handoffs to one conversation — this is what the agent sees when deciding create-vs-update, so a message in one chat can never silently update a request from an unrelated thread. */
  async listForConversation(conversationId: string): Promise<HandoffRecord[]> {
    const rows = await this.prisma.handoffRequest.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toRecord);
  }

  async get(id: string): Promise<HandoffRecord> {
    const row = await this.prisma.handoffRequest.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Handoff ${id} not found`);
    return toRecord(row);
  }

  async create(input: {
    patientId: string;
    conversationId: string;
    type: HandoffType;
    details: Record<string, unknown>;
    messageIds: string[];
  }): Promise<HandoffRecord> {
    const row = await this.prisma.handoffRequest.create({
      data: {
        patientId: input.patientId,
        conversationId: input.conversationId,
        type: input.type,
        status: 'pending_staff',
        details: JSON.stringify(input.details),
        messageIds: JSON.stringify(input.messageIds),
      },
    });
    return toRecord(row);
  }

  /** Merges `detailsPatch` into the existing details and appends new message ids. Used when a later message changes an existing request instead of creating a duplicate. */
  async update(
    id: string,
    input: { detailsPatch?: Record<string, unknown>; appendMessageIds?: string[] },
  ): Promise<HandoffRecord> {
    const existing = await this.get(id);
    const mergedDetails = mergeDetails(existing.details, input.detailsPatch ?? {});
    const mergedMessageIds = mergeMessageIds(existing.messageIds, input.appendMessageIds ?? []);
    const row = await this.prisma.handoffRequest.update({
      where: { id },
      data: {
        details: JSON.stringify(mergedDetails),
        messageIds: JSON.stringify(mergedMessageIds),
      },
    });
    return toRecord(row);
  }

  async setStatus(id: string, status: HandoffStatus, actor: 'staff' | 'patient' = 'staff'): Promise<HandoffRecord> {
    const result = await this.prisma.$transaction(async (tx) => {
      const previous = await tx.handoffRequest.findUnique({ where: { id } });
      if (!previous) throw new NotFoundException(`Handoff ${id} not found`);
      if (previous.status === status) return { record: toRecord(previous) };
      const row = await tx.handoffRequest.update({ where: { id }, data: { status } });
      const record = toRecord(row);
      if (record.type !== 'appointment_request') return { record };
      // A chat may have been deleted while its independent staff request remains.
      const conversation = await tx.conversation.findUnique({ where: { id: row.conversationId } });
      if (!conversation) return { record };
      const details = record.details;
      const description = [details.reason, details.date, details.slot_start || details.window, details.provider]
        .filter(Boolean).join(', ');
      const state = status === 'resolved' ? 'approved by staff' : status === 'cancelled' ? `cancelled by ${actor === 'patient' ? 'you' : 'staff'}` : 'returned to pending staff review';
      const message = await tx.message.create({ data: {
        conversationId: row.conversationId, sender: 'clinic',
        body: `Your appointment request (${description || 'appointment'}) has been ${state}.`,
      } });
      await tx.conversation.update({ where: { id: conversation.id }, data: { patientId: conversation.patientId } });
      return { record, message: { id: message.id, sender: message.sender, body: message.body, createdAt: message.createdAt.toISOString() } };
    });
    this.events.emit('statusChanged', result);
    return result.record;
  }
}

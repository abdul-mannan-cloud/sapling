import { describe, expect, it, vi } from 'vitest';
import { HandoffService } from './handoff.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function setup(status = 'pending_staff', conversationExists = true) {
  const row = { id: 'h1', patientId: 'pt_001', conversationId: 'c1', type: 'appointment_request', status,
    details: JSON.stringify({ date: '2026-11-10', window: 'afternoon' }), messageIds: '[]', createdAt: new Date(), updatedAt: new Date() };
  const tx = {
    handoffRequest: { findUnique: vi.fn().mockResolvedValue(row), update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...row, ...data })) },
    conversation: { findUnique: vi.fn().mockResolvedValue(conversationExists ? { id: 'c1', patientId: 'pt_001' } : null), update: vi.fn() },
    message: { create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: 'm1', createdAt: new Date() })) },
  };
  const service = new HandoffService({ $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } as unknown as PrismaService);
  return { service, tx };
}

describe('appointment status notifications', () => {
  it('persists and emits an approval message with saved date and window', async () => {
    const { service, tx } = setup();
    const listener = vi.fn();
    service.events.on('statusChanged', listener);
    const record = await service.setStatus('h1', 'resolved');
    expect(record.status).toBe('resolved');
    expect(tx.message.create).toHaveBeenCalledWith({ data: expect.objectContaining({ conversationId: 'c1', sender: 'clinic', body: expect.stringContaining('approved by staff') }) });
    expect(listener.mock.calls[0][0].message.body).toContain('2026-11-10, afternoon');
  });
  it('does not duplicate a notification when the same status is submitted again', async () => {
    const { service, tx } = setup('resolved');
    await service.setStatus('h1', 'resolved');
    expect(tx.message.create).not.toHaveBeenCalled();
  });
  it('notifies cancellation without claiming approval', async () => {
    const { service, tx } = setup();
    await service.setStatus('h1', 'cancelled');
    expect(tx.message.create.mock.calls[0][0].data.body).toContain('cancelled by staff');
  });
  it('allows staff to finish a request whose original conversation was deleted', async () => {
    const { service, tx } = setup('pending_staff', false);
    expect((await service.setStatus('h1', 'resolved')).status).toBe('resolved');
    expect(tx.message.create).not.toHaveBeenCalled();
  });
});

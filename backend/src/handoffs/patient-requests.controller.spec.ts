import { describe, expect, it, vi } from 'vitest';
import { PatientRequestsController } from './patient-requests.controller.js';
import type { HandoffService } from './handoff.service.js';
const user = { userId: 'u1', username: 'alex', role: 'patient' as const, patientId: 'pt_001' };
function setup(patientId = 'pt_001') {
  const record = { id: 'h1', patientId, type: 'appointment_request', status: 'resolved', details: {} };
  const service = { get: vi.fn().mockResolvedValue(record), update: vi.fn(), setStatus: vi.fn().mockResolvedValue(record) };
  return { controller: new PatientRequestsController(service as unknown as HandoffService), service };
}
describe('patient request access and changes', () => {
  it('denies editing another patient request', async () => {
    const { controller, service } = setup('someone-else');
    await expect(controller.edit('h1', user, { date: '2026-11-12' })).rejects.toThrow('does not belong');
    expect(service.update).not.toHaveBeenCalled();
  });
  it('denies cancelling another patient request', async () => {
    const { controller, service } = setup('someone-else');
    await expect(controller.cancel('h1', user)).rejects.toThrow('does not belong');
    expect(service.setStatus).not.toHaveBeenCalled();
  });
  it('returns edited bookings to pending review and clears an obsolete exact time', async () => {
    const { controller, service } = setup();
    await controller.edit('h1', user, { date: '2026-11-12' });
    expect(service.update).toHaveBeenCalledWith('h1', { detailsPatch: { date: '2026-11-12', slot_start: '' } });
    expect(service.setStatus).toHaveBeenCalledWith('h1', 'pending_staff', 'patient');
  });
  it('cancels the owned booking using the patient identity', async () => {
    const { controller, service } = setup();
    await controller.cancel('h1', user);
    expect(service.setStatus).toHaveBeenCalledWith('h1', 'cancelled', 'patient');
  });
});

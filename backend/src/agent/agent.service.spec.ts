import { describe, expect, it, vi } from 'vitest';
import { AgentService, protectPendingAppointments } from './agent.service.js';
import type { RuleAgentService } from './rule-agent.service.js';
import type { LlmAgentService } from './llm-agent.service.js';
import type { OfflineModeService } from '../agent-mode/offline-mode.service.js';
import type { AgentContext } from './types.js';
import { PatientService } from '../patient/patient.service.js';
import { FaqService } from '../faq/faq.service.js';

const patient = new PatientService().getRecord();
const faq = new FaqService();

function buildContext(body: string): AgentContext {
  return {
    nowIso: '2026-11-04T10:00:00-08:00',
    nowDescription: 'Wednesday, November 4, 2026 at 10:00 AM Pacific',
    patient,
    faqText: faq.getFaqText(),
    openSlots: faq.getOpenSlots(),
    history: [],
    handoffs: [],
    currentMessage: { id: 'm1', sender: 'patient', body, createdAt: new Date().toISOString() },
  };
}

describe('AgentService — offline mode override', () => {
  it('uses the LLM when configured and the override is off', async () => {
    const ruleAgent = { run: vi.fn() } as unknown as RuleAgentService;
    const llmAgent = { isConfigured: () => true, run: vi.fn().mockResolvedValue({ mode: 'llm', reply: 'from llm' }) } as unknown as LlmAgentService;
    const offlineMode = { isForced: vi.fn().mockResolvedValue(false) } as unknown as OfflineModeService;
    const agent = new AgentService(ruleAgent, llmAgent, offlineMode);

    const result = await agent.handle(buildContext('what time do you close today?'));

    expect(result.reply).toBe('from llm');
    expect(llmAgent.run).toHaveBeenCalledOnce();
    expect(ruleAgent.run).not.toHaveBeenCalled();
  });

  it('forces the rule agent when the override is on, even though the LLM is configured', async () => {
    const ruleAgent = { run: vi.fn().mockReturnValue({ mode: 'rule', reply: 'from rule agent' }) } as unknown as RuleAgentService;
    const llmAgent = { isConfigured: () => true, run: vi.fn() } as unknown as LlmAgentService;
    const offlineMode = { isForced: vi.fn().mockResolvedValue(true) } as unknown as OfflineModeService;
    const agent = new AgentService(ruleAgent, llmAgent, offlineMode);

    const result = await agent.handle(buildContext('what time do you close today?'));

    expect(result.reply).toBe('from rule agent');
    expect(ruleAgent.run).toHaveBeenCalledOnce();
    expect(llmAgent.run).not.toHaveBeenCalled();
  });

  it('still catches an emergency before ever checking the override', async () => {
    const ruleAgent = { run: vi.fn() } as unknown as RuleAgentService;
    const llmAgent = { isConfigured: () => true, run: vi.fn() } as unknown as LlmAgentService;
    const offlineMode = { isForced: vi.fn().mockResolvedValue(false) } as unknown as OfflineModeService;
    const agent = new AgentService(ruleAgent, llmAgent, offlineMode);

    const result = await agent.handle(buildContext('I have chest pain and my left arm feels numb'));

    expect(result.mode).toBe('emergency');
    expect(offlineMode.isForced).not.toHaveBeenCalled();
    expect(ruleAgent.run).not.toHaveBeenCalled();
    expect(llmAgent.run).not.toHaveBeenCalled();
  });
});

describe('pending appointment protection', () => {
  const pending = { id: 'request1', patientId: 'pt_001', conversationId: 'other-chat', type: 'appointment_request' as const, status: 'pending_staff' as const, details: { date: '2026-11-10', window: 'afternoon' }, messageIds: [], createdAt: '', updatedAt: '' };
  const proposal = { mode: 'llm' as const, reply: 'Saved another request', handoffAction: { operation: 'create' as const, type: 'appointment_request' as const, details: { date: '2026-11-12' } } };
  it('blocks an additional request and asks for confirmation across chats', () => {
    const ctx = { ...buildContext('book Thursday'), handoffs: [pending] };
    const result = protectPendingAppointments(ctx, proposal);
    expect(result.handoffAction).toBeUndefined();
    expect(result.reply).toContain('1 pending');
    expect(result.reply).toContain('2026-11-10');
  });
  it('allows an additional request after explicit confirmation', () => {
    const ctx = { ...buildContext('yes, Thursday afternoon'), handoffs: [pending] };
    ctx.history = [{ id: 'a', sender: 'agent', body: 'Do you still want an additional appointment request?', createdAt: '' }];
    expect(protectPendingAppointments(ctx, proposal)).toBe(proposal);
  });
  it('does not treat a refusal as consent', () => {
    const ctx = { ...buildContext('no'), handoffs: [pending] };
    expect(protectPendingAppointments(ctx, proposal).handoffAction).toBeUndefined();
  });
  it('does not treat a "yes" substring inside an overall refusal as consent', () => {
    const ctx = { ...buildContext('yes to the existing one, no additional appointment'), handoffs: [pending] };
    ctx.history = [{ id: 'a', sender: 'agent', body: 'Do you still want an additional appointment request?', createdAt: '' }];
    expect(protectPendingAppointments(ctx, proposal).handoffAction).toBeUndefined();
  });
});

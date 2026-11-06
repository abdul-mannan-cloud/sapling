import { describe, expect, it, vi } from 'vitest';
import { AgentService } from './agent.service.js';
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

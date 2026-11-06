import { Injectable, Logger } from '@nestjs/common';
import { emergencyReplyFor, isEmergency } from './emergency.js';
import { RuleAgentService } from './rule-agent.service.js';
import { LlmAgentService } from './llm-agent.service.js';
import { OfflineModeService } from '../agent-mode/offline-mode.service.js';
import type { AgentContext, AgentResult } from './types.js';

/**
 * Orchestrates one inbound patient message. The emergency check always
 * runs first and in application code — never delegated to the model — so
 * a safety failure can't come from an LLM mistake or a dropped tool call.
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly ruleAgent: RuleAgentService,
    private readonly llmAgent: LlmAgentService,
    private readonly offlineMode: OfflineModeService,
  ) {}

  async handle(ctx: AgentContext): Promise<AgentResult> {
    if (isEmergency(ctx.currentMessage.body)) {
      return {
        mode: 'emergency',
        reply: emergencyReplyFor(ctx.channel ?? 'text'),
        handoffAction: {
          operation: 'create',
          type: 'emergency',
          details: { message: ctx.currentMessage.body },
        },
      };
    }

    // A manual override (sidebar toggle, either role) always wins, even
    // with an API key configured — this is what actually demonstrates
    // the offline path on demand, rather than only ever running it when
    // OPENAI_API_KEY happens to be unset.
    const forcedOffline = await this.offlineMode.isForced();

    if (!forcedOffline && this.llmAgent.isConfigured()) {
      try {
        return await this.llmAgent.run(ctx);
      } catch (err) {
        this.logger.error('LLM agent failed, falling back to rule agent', err as Error);
        return this.ruleAgent.run(ctx);
      }
    }

    return this.ruleAgent.run(ctx);
  }
}

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

    const pending = ctx.handoffs.filter((h) => h.type === 'appointment_request' && h.status === 'pending_staff');
    const text = ctx.currentMessage.body.toLowerCase();
    if (pending.length && /\b(book|schedule|another|additional)\b/.test(text) &&
        !/\b(change|update|reschedule|instead)\b/.test(text) && !/\b(status|confirmed|approved|pending)\b/.test(text)) {
      const warning = protectPendingAppointments(ctx, { mode: 'rule', reply: '', handoffAction: { operation: 'create', type: 'appointment_request', details: {} } });
      if (!warning.handoffAction) return warning;
    }

    // A manual override (sidebar toggle, either role) always wins, even
    // with an API key configured — this is what actually demonstrates
    // the offline path on demand, rather than only ever running it when
    // OPENAI_API_KEY happens to be unset.
    const forcedOffline = await this.offlineMode.isForced();

    if (!forcedOffline && this.llmAgent.isConfigured()) {
      try {
        return protectPendingAppointments(ctx, await this.llmAgent.run(ctx));
      } catch (err) {
        this.logger.error('LLM agent failed, falling back to rule agent', err as Error);
        return protectPendingAppointments(ctx, this.ruleAgent.run(ctx));
      }
    }

    return protectPendingAppointments(ctx, this.ruleAgent.run(ctx));
  }
}

export function protectPendingAppointments(ctx: AgentContext, result: AgentResult): AgentResult {
  const pending = ctx.handoffs.filter((h) => h.type === 'appointment_request' && h.status === 'pending_staff');
  if (!pending.length || result.handoffAction?.type !== 'appointment_request' || result.handoffAction.operation !== 'create') return result;
  const previousReply = [...ctx.history].reverse().find((m) => m.sender === 'agent');
  // A bare "yes" substring isn't enough — "yes to the existing one, no
  // additional appointment" would otherwise match /\byes\b/ and be read as
  // consent despite being an explicit refusal. Require an affirmative with
  // no contradicting negation anywhere in the same reply.
  const hasAffirmative = /\b(yes|yeah|yep|sure|proceed|go ahead|still want)\b/i.test(ctx.currentMessage.body);
  const hasNegation = /\b(no|not|don'?t|do not|never mind|nevermind)\b/i.test(ctx.currentMessage.body);
  const consent = previousReply?.body.includes('Do you still want an additional appointment request?') && hasAffirmative && !hasNegation;
  if (consent) return result;
  return {
    mode: result.mode,
    reply: `You already have ${pending.length} pending appointment request${pending.length === 1 ? '' : 's'} awaiting staff review: ${pending.map((h) => [h.details.date, h.details.slot_start || h.details.window, h.details.reason].filter(Boolean).join(', ')).join('; ')}. Do you still want an additional appointment request?`,
  };
}

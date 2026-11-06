import { Module } from '@nestjs/common';
import { AgentService } from './agent.service.js';
import { RuleAgentService } from './rule-agent.service.js';
import { LlmAgentService } from './llm-agent.service.js';

@Module({
  providers: [AgentService, RuleAgentService, LlmAgentService],
  exports: [AgentService, LlmAgentService],
})
export class AgentModule {}

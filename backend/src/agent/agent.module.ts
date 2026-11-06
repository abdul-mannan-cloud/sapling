import { Module } from '@nestjs/common';
import { AgentService } from './agent.service.js';
import { RuleAgentService } from './rule-agent.service.js';
import { LlmAgentService } from './llm-agent.service.js';
import { OfflineModeModule } from '../agent-mode/offline-mode.module.js';

@Module({
  imports: [OfflineModeModule],
  providers: [AgentService, RuleAgentService, LlmAgentService],
  exports: [AgentService, LlmAgentService],
})
export class AgentModule {}

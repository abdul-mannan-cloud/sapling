import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service.js';
import { ConversationController } from './conversation.controller.js';
import { PatientModule } from '../patient/patient.module.js';
import { FaqModule } from '../faq/faq.module.js';
import { ClockModule } from '../clock/clock.module.js';
import { HandoffModule } from '../handoffs/handoff.module.js';
import { AgentModule } from '../agent/agent.module.js';

@Module({
  imports: [PatientModule, FaqModule, ClockModule, HandoffModule, AgentModule],
  controllers: [ConversationController],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule {}

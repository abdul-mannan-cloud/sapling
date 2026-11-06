import { PatientRequestsController } from './patient-requests.controller.js';
import { Module } from '@nestjs/common';
import { HandoffService } from './handoff.service.js';
import { HandoffController } from './handoff.controller.js';

@Module({
  controllers: [HandoffController, PatientRequestsController],
  providers: [HandoffService],
  exports: [HandoffService],
})
export class HandoffModule {}

import { Module } from '@nestjs/common';
import { PatientService } from './patient.service.js';
import { PatientController } from './patient.controller.js';

@Module({
  controllers: [PatientController],
  providers: [PatientService],
  exports: [PatientService],
})
export class PatientModule {}

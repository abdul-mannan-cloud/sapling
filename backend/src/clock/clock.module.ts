import { Module } from '@nestjs/common';
import { ClockService } from './clock.service.js';
import { ClockController } from './clock.controller.js';

@Module({
  controllers: [ClockController],
  providers: [ClockService],
  exports: [ClockService],
})
export class ClockModule {}

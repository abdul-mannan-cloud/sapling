import { Module } from '@nestjs/common';
import { OfflineModeService } from './offline-mode.service.js';
import { OfflineModeController } from './offline-mode.controller.js';

@Module({
  controllers: [OfflineModeController],
  providers: [OfflineModeService],
  exports: [OfflineModeService],
})
export class OfflineModeModule {}

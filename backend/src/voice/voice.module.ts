import { Module } from '@nestjs/common';
import { VoiceService } from './voice.service.js';

@Module({
  providers: [VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}

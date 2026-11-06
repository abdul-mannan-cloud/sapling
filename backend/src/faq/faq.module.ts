import { Module } from '@nestjs/common';
import { FaqService } from './faq.service.js';
import { FaqController } from './faq.controller.js';

@Module({
  controllers: [FaqController],
  providers: [FaqService],
  exports: [FaqService],
})
export class FaqModule {}

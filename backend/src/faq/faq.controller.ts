import { Controller, Get } from '@nestjs/common';
import { FaqService } from './faq.service.js';

@Controller()
export class FaqController {
  constructor(private readonly faq: FaqService) {}

  @Get('faq')
  getFaq() {
    return { text: this.faq.getFaqText() };
  }

  @Get('open-slots')
  getOpenSlots() {
    return this.faq.getOpenSlots();
  }
}

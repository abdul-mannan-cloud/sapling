import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface OpenSlot {
  date: string;
  start: string;
  provider: string;
}

const faqPath = fileURLToPath(new URL('../data/clinic_faq.md', import.meta.url));
const slotsPath = fileURLToPath(new URL('../data/open_slots.json', import.meta.url));

const FAQ_TEXT = readFileSync(faqPath, 'utf-8');
const OPEN_SLOTS: OpenSlot[] = JSON.parse(readFileSync(slotsPath, 'utf-8'));

/**
 * The FAQ markdown is the only source of clinic policy. Open slots are
 * read-only context for suggesting times; the agent may never reserve one.
 */
@Injectable()
export class FaqService {
  getFaqText(): string {
    return FAQ_TEXT;
  }

  getOpenSlots(): OpenSlot[] {
    return OPEN_SLOTS;
  }
}

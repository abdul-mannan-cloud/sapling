import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const CLOCK_KEY = 'now';
const DEFAULT_NOW = '2026-11-04T10:00:00-08:00';

/**
 * The scenario's "now" is a setting, not the host machine's real clock, so
 * the walkthrough can move it around without restarting anything.
 */
@Injectable()
export class ClockService {
  constructor(private readonly prisma: PrismaService) {}

  async getNowIso(): Promise<string> {
    const row = await this.prisma.setting.findUnique({ where: { key: CLOCK_KEY } });
    if (!row) {
      await this.prisma.setting.create({ data: { key: CLOCK_KEY, value: DEFAULT_NOW } });
      return DEFAULT_NOW;
    }
    return row.value;
  }

  async getNow(): Promise<Date> {
    return new Date(await this.getNowIso());
  }

  async setNow(iso: string): Promise<string> {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid date: ${iso}`);
    }
    await this.prisma.setting.upsert({
      where: { key: CLOCK_KEY },
      create: { key: CLOCK_KEY, value: iso },
      update: { value: iso },
    });
    return iso;
  }

  /** Human-readable summary used in agent prompts, e.g. "Wednesday, November 4, 2026, 10:00 AM Pacific". */
  async describeNow(): Promise<string> {
    const now = await this.getNow();
    return (
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Los_Angeles',
      }).format(now) + ' Pacific'
    );
  }
}

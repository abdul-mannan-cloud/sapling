import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const OFFLINE_MODE_KEY = 'force_offline_mode';

/**
 * A global, persisted override that forces every conversation onto the
 * deterministic rule-based agent, even when OPENAI_API_KEY is configured
 * — so the walkthrough (or the patient, or staff) can demonstrate the
 * offline path on demand without restarting the server or touching
 * environment variables. Mirrors ClockService's Setting-table pattern.
 */
@Injectable()
export class OfflineModeService {
  constructor(private readonly prisma: PrismaService) {}

  async isForced(): Promise<boolean> {
    const row = await this.prisma.setting.findUnique({ where: { key: OFFLINE_MODE_KEY } });
    return row?.value === 'true';
  }

  async setForced(forced: boolean): Promise<boolean> {
    await this.prisma.setting.upsert({
      where: { key: OFFLINE_MODE_KEY },
      create: { key: OFFLINE_MODE_KEY, value: String(forced) },
      update: { value: String(forced) },
    });
    return forced;
  }
}

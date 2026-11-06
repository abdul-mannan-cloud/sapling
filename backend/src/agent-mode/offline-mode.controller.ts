import { Body, Controller, Get, Put } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsBoolean } from 'class-validator';
import { OfflineModeService } from './offline-mode.service.js';

class SetOfflineModeDto {
  @IsBoolean()
  forced!: boolean;
}

/**
 * No role restriction — the brief asks for a local demo mode that runs
 * without any hosted API, and both roles (admin running the walkthrough,
 * or the patient testing resilience) should be able to flip to it from
 * their own sidebar without needing the other role's help.
 */
@Controller('agent-mode')
export class OfflineModeController {
  constructor(
    private readonly offlineMode: OfflineModeService,
    private readonly config: ConfigService,
  ) {}

  private llmConfigured(): boolean {
    return Boolean(this.config.get<string>('OPENAI_API_KEY'));
  }

  @Get()
  async get() {
    return { forced: await this.offlineMode.isForced(), llmConfigured: this.llmConfigured() };
  }

  @Put()
  async set(@Body() dto: SetOfflineModeDto) {
    const forced = await this.offlineMode.setForced(dto.forced);
    return { forced, llmConfigured: this.llmConfigured() };
  }
}

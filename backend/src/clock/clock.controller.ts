import { Body, Controller, Get, Put } from '@nestjs/common';
import { IsISO8601 } from 'class-validator';
import { ClockService } from './clock.service.js';
import { Roles } from '../auth/roles.decorator.js';

class SetClockDto {
  @IsISO8601({ strict: false })
  now!: string;
}

@Controller('clock')
export class ClockController {
  constructor(private readonly clock: ClockService) {}

  @Get()
  async get() {
    return { now: await this.clock.getNowIso(), description: await this.clock.describeNow() };
  }

  @Roles('admin')
  @Put()
  async set(@Body() dto: SetClockDto) {
    const now = await this.clock.setNow(dto.now);
    return { now, description: await this.clock.describeNow() };
  }
}

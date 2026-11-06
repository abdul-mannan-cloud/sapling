import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { HandoffService } from './handoff.service.js';
import type { HandoffStatus } from './handoff.types.js';
import { Roles } from '../auth/roles.decorator.js';

const STATUSES: HandoffStatus[] = ['pending_staff', 'resolved', 'cancelled'];

class SetStatusDto {
  @IsIn(STATUSES)
  status!: HandoffStatus;
}

@Roles('admin')
@Controller('handoffs')
export class HandoffController {
  constructor(private readonly handoffs: HandoffService) {}

  @Get()
  list(@Query('patientId') patientId?: string) {
    return this.handoffs.list(patientId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.handoffs.get(id);
  }

  /** Optional staff view action: mark a pending request resolved/cancelled after staff carries out the real-world action. The agent itself never calls this. */
  @Patch(':id')
  setStatus(@Param('id') id: string, @Body() dto: SetStatusDto) {
    return this.handoffs.setStatus(id, dto.status);
  }
}

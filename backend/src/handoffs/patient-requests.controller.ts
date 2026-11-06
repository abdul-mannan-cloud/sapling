import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import type { AuthUser } from '../auth/types.js';
import { HandoffService } from './handoff.service.js';

class EditRequestDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @IsOptional() @IsString() @MaxLength(100) date?: string;
  @IsOptional() @IsIn(['morning', 'afternoon', 'evening']) window?: string;
  @IsOptional() @IsString() @MaxLength(100) provider?: string;
  @IsOptional() @IsString() @MaxLength(100) medication?: string;
  @IsOptional() @IsString() @MaxLength(200) pharmacy?: string;
}

@Roles('patient')
@Controller('my-requests')
export class PatientRequestsController {
  constructor(private readonly handoffs: HandoffService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return (await this.handoffs.list(user.patientId!)).filter((h) => ['appointment_request', 'refill'].includes(h.type));
  }

  private async assertAccess(id: string, user: AuthUser) {
    const record = await this.handoffs.get(id);
    if (!user.patientId || record.patientId !== user.patientId || !['appointment_request', 'refill'].includes(record.type)) {
      throw new ForbiddenException('This request does not belong to you');
    }
    return record;
  }

  @Patch(':id')
  async edit(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: EditRequestDto) {
    const record = await this.assertAccess(id, user);
    const fields = record.type === 'appointment_request' ? ['reason', 'date', 'window', 'provider'] : ['medication', 'pharmacy'];
    const detailsPatch = Object.fromEntries(Object.entries(dto).filter(([key, value]) => fields.includes(key) && value !== undefined));
    if ('date' in detailsPatch || 'window' in detailsPatch) detailsPatch.slot_start = '';
    await this.handoffs.update(id, { detailsPatch });
    // Every manual change needs staff review, including an already approved booking.
    const updated = await this.handoffs.setStatus(id, 'pending_staff', 'patient');
    return updated;
  }

  @Delete(':id')
  async cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.assertAccess(id, user);
    return this.handoffs.setStatus(id, 'cancelled', 'patient');
  }
}

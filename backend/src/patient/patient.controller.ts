import { Controller, ForbiddenException, Get, NotFoundException, Param } from '@nestjs/common';
import { PatientService } from './patient.service.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import type { AuthUser } from '../auth/types.js';

@Controller('patients')
export class PatientController {
  constructor(private readonly patient: PatientService) {}

  @Roles('admin')
  @Get()
  list() {
    return this.patient.list().map((p) => ({ patient_id: p.patient_id, name: p.name, preferred_name: p.preferred_name }));
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (user.role === 'patient' && user.patientId !== id) {
      throw new ForbiddenException("Can't view another patient's record");
    }
    const record = this.patient.getById(id);
    if (!record) throw new NotFoundException(`Patient ${id} not found`);
    return record;
  }
}

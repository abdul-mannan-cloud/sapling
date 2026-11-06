import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { DEFAULT_PATIENT_ID } from '../conversations/conversation.service.js';
import type { AuthUser, JwtPayload, Role } from './types.js';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Seeds the two demo accounts on first boot. Idempotent — does nothing once users exist. */
  async onModuleInit() {
    const count = await this.prisma.user.count();
    if (count > 0) return;

    const adminPassword = this.config.get<string>('SEED_ADMIN_PASSWORD') ?? 'admin123';
    const patientPassword = this.config.get<string>('SEED_PATIENT_PASSWORD') ?? 'alex123';

    await this.prisma.user.create({
      data: { username: 'admin', passwordHash: await bcrypt.hash(adminPassword, 10), role: 'admin' },
    });
    await this.prisma.user.create({
      data: {
        username: 'alex',
        passwordHash: await bcrypt.hash(patientPassword, 10),
        role: 'patient',
        patientId: DEFAULT_PATIENT_ID,
      },
    });

    this.logger.warn(
      `Seeded demo accounts — admin/${adminPassword} and alex/${patientPassword}. Change SEED_ADMIN_PASSWORD / SEED_PATIENT_PASSWORD in .env before this ever runs anywhere but localhost.`,
    );
  }

  async login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const row = await this.prisma.user.findUnique({ where: { username } });
    if (!row) throw new UnauthorizedException('Invalid username or password');

    const ok = await bcrypt.compare(password, row.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid username or password');

    const user: AuthUser = {
      userId: row.id,
      username: row.username,
      role: row.role as Role,
      patientId: row.patientId ?? undefined,
    };
    const payload: JwtPayload = { sub: user.userId, username: user.username, role: user.role, patientId: user.patientId };
    const token = await this.jwt.signAsync(payload);
    return { token, user };
  }

  /** Shared by the HTTP guard and the socket gateway so both authenticate identically. */
  async verifyToken(token: string): Promise<AuthUser> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      return { userId: payload.sub, username: payload.username, role: payload.role, patientId: payload.patientId };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

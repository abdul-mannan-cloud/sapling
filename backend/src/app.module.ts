import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ClockModule } from './clock/clock.module.js';
import { PatientModule } from './patient/patient.module.js';
import { FaqModule } from './faq/faq.module.js';
import { HandoffModule } from './handoffs/handoff.module.js';
import { ConversationModule } from './conversations/conversation.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ChatModule } from './chat/chat.module.js';
import { OfflineModeModule } from './agent-mode/offline-mode.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ClockModule,
    PatientModule,
    FaqModule,
    HandoffModule,
    ConversationModule,
    ChatModule,
    OfflineModeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { HandoffModule } from '../handoffs/handoff.module.js';
import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway.js';
import { ConversationModule } from '../conversations/conversation.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { VoiceModule } from '../voice/voice.module.js';

@Module({
  imports: [HandoffModule, ConversationModule, AuthModule, VoiceModule],
  providers: [ChatGateway],
})
export class ChatModule {}

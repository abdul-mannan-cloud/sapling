import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway.js';
import { ConversationModule } from '../conversations/conversation.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { VoiceModule } from '../voice/voice.module.js';

@Module({
  imports: [ConversationModule, AuthModule, VoiceModule],
  providers: [ChatGateway],
})
export class ChatModule {}

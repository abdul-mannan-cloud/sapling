import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway.js';
import { ConversationModule } from '../conversations/conversation.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [ConversationModule, AuthModule],
  providers: [ChatGateway],
})
export class ChatModule {}

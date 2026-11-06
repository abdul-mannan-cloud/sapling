import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { ConversationService } from './conversation.service.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/types.js';

class CreateConversationDto {
  /** Required for admin (which patient to start a thread for); ignored for patient role, who always creates for themself. */
  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsString()
  title?: string;
}

class RenameConversationDto {
  @IsString()
  @MinLength(1)
  title!: string;
}

/**
 * Sending messages moved to the WebSocket gateway (chat/chat.gateway.ts) —
 * this controller only handles listing/creating/renaming/deleting threads,
 * the structural operations that don't need to be real-time.
 */
@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversations: ConversationService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('patientId') patientId?: string) {
    if (user.role === 'patient') return this.conversations.list(user.patientId);
    return this.conversations.list(patientId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateConversationDto) {
    if (user.role === 'patient') return this.conversations.create(user.patientId!, dto.title);
    if (!dto.patientId) throw new ForbiddenException('patientId is required when creating a conversation as admin');
    return this.conversations.create(dto.patientId, dto.title);
  }

  @Get(':id/messages')
  async getMessages(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.assertAccess(id, user);
    return this.conversations.getMessages(id);
  }

  @Patch(':id')
  async rename(@Param('id') id: string, @Body() dto: RenameConversationDto, @CurrentUser() user: AuthUser) {
    await this.assertAccess(id, user);
    return this.conversations.rename(id, dto.title);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (user.role !== 'patient') throw new ForbiddenException('Only the patient can delete their own chat');
    await this.assertAccess(id, user);
    await this.conversations.remove(id);
    return { ok: true };
  }

  private async assertAccess(conversationId: string, user: AuthUser) {
    const convo = await this.conversations.assertConversation(conversationId);
    if (user.role === 'patient' && convo.patientId !== user.patientId) {
      throw new ForbiddenException("Can't access another patient's conversation");
    }
    return convo;
  }
}

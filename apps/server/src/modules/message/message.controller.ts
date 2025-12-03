import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { SendMessageDto } from './dto';
import { CurrentUser } from '../auth';

@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  /**
   * 发送消息（REST API 备用，主要通过 WebSocket）
   */
  @Post()
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messageService.sendMessage(userId, dto);
  }

  /**
   * 获取会话消息历史
   */
  @Get('conversation/:conversationId')
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Query('before') before?: string,
    @Query('after') after?: string,
    @Query('limit') limit?: number,
  ) {
    return this.messageService.getMessages(userId, conversationId, {
      before,
      after,
      limit,
    });
  }

  /**
   * 编辑消息
   */
  @Put(':id')
  async editMessage(
    @CurrentUser('id') userId: string,
    @Param('id') messageId: string,
    @Body('content') content: string,
  ) {
    return this.messageService.editMessage(userId, messageId, content);
  }

  /**
   * 删除消息
   */
  @Delete(':id')
  async deleteMessage(
    @CurrentUser('id') userId: string,
    @Param('id') messageId: string,
  ) {
    return this.messageService.deleteMessage(userId, messageId);
  }

  /**
   * 标记消息已读
   */
  @Post('read')
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Body('conversationId') conversationId: string,
    @Body('messageId') messageId: string,
  ) {
    return this.messageService.markAsRead(userId, conversationId, messageId);
  }
}

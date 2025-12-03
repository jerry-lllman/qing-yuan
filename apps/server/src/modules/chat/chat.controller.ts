import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import {
  CreatePrivateChatDto,
  CreateGroupDto,
  UpdateConversationDto,
} from './dto';
import { CurrentUser } from '../auth';

@Controller('conversations')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * 创建私聊会话
   */
  @Post('private')
  async createPrivateChat(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePrivateChatDto,
  ) {
    return this.chatService.createOrGetPrivateChat(userId, dto);
  }

  /**
   * 创建群聊
   */
  @Post('group')
  async createGroup(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateGroupDto,
  ) {
    return this.chatService.createGroup(userId, dto);
  }

  /**
   * 获取会话列表
   */
  @Get()
  async getConversations(@CurrentUser('id') userId: string) {
    return this.chatService.getConversations(userId);
  }

  /**
   * 获取会话详情
   */
  @Get(':id')
  async getConversation(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.chatService.getConversation(userId, id);
  }

  /**
   * 更新会话设置
   */
  @Put(':id')
  async updateConversation(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.chatService.updateConversation(userId, id, dto);
  }

  /**
   * 退出会话
   */
  @Post(':id/leave')
  async leaveConversation(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.chatService.leaveConversation(userId, id);
  }

  /**
   * 删除会话
   */
  @Delete(':id')
  async deleteConversation(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.chatService.deleteConversation(userId, id);
  }
}

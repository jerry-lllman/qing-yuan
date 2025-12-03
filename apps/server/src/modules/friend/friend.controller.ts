import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { FriendService } from './friend.service';
import { SendFriendRequestDto, UpdateFriendDto } from './dto';
import { CurrentUser } from '../auth';

@Controller('friends')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  /**
   * 发送好友请求
   */
  @Post('requests')
  async sendRequest(
    @CurrentUser('id') userId: string,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendService.sendFriendRequest(userId, dto);
  }

  /**
   * 获取收到的好友请求
   */
  @Get('requests/received')
  async getReceivedRequests(@CurrentUser('id') userId: string) {
    return this.friendService.getReceivedRequests(userId);
  }

  /**
   * 获取发送的好友请求
   */
  @Get('requests/sent')
  async getSentRequests(@CurrentUser('id') userId: string) {
    return this.friendService.getSentRequests(userId);
  }

  /**
   * 接受好友请求
   */
  @Post('requests/:id/accept')
  async acceptRequest(
    @CurrentUser('id') userId: string,
    @Param('id') requestId: string,
  ) {
    return this.friendService.acceptFriendRequest(userId, requestId);
  }

  /**
   * 拒绝好友请求
   */
  @Post('requests/:id/reject')
  async rejectRequest(
    @CurrentUser('id') userId: string,
    @Param('id') requestId: string,
  ) {
    return this.friendService.rejectFriendRequest(userId, requestId);
  }

  /**
   * 获取好友列表
   */
  @Get()
  async getFriends(@CurrentUser('id') userId: string) {
    return this.friendService.getFriends(userId);
  }

  /**
   * 更新好友备注
   */
  @Put(':friendId')
  async updateFriend(
    @CurrentUser('id') userId: string,
    @Param('friendId') friendId: string,
    @Body() dto: UpdateFriendDto,
  ) {
    return this.friendService.updateFriend(userId, friendId, dto);
  }

  /**
   * 删除好友
   */
  @Delete(':friendId')
  async deleteFriend(
    @CurrentUser('id') userId: string,
    @Param('friendId') friendId: string,
  ) {
    return this.friendService.deleteFriend(userId, friendId);
  }
}

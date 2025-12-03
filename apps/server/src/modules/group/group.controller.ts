import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { GroupService } from './group.service';
import { CurrentUser } from '../auth/decorators';
import {
  UpdateGroupDto,
  AddMembersDto,
  UpdateMemberDto,
  TransferOwnerDto,
} from './dto';

@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  /**
   * 获取群组详情
   */
  @Get(':groupId')
  async getGroup(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.groupService.getGroup(userId, groupId);
  }

  /**
   * 更新群组信息
   */
  @Put(':groupId')
  async updateGroup(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupService.updateGroup(userId, groupId, dto);
  }

  /**
   * 获取群成员列表
   */
  @Get(':groupId/members')
  async getMembers(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.groupService.getMembers(userId, groupId);
  }

  /**
   * 添加群成员
   */
  @Post(':groupId/members')
  async addMembers(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Body() dto: AddMembersDto,
  ) {
    return this.groupService.addMembers(userId, groupId, dto);
  }

  /**
   * 移除群成员
   */
  @Delete(':groupId/members/:memberId')
  async removeMember(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.groupService.removeMember(userId, groupId, memberId);
  }

  /**
   * 更新群成员信息（群昵称、角色）
   */
  @Put(':groupId/members/:memberId')
  async updateMember(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.groupService.updateMember(userId, groupId, memberId, dto);
  }

  /**
   * 设置/取消管理员
   */
  @Put(':groupId/members/:memberId/admin')
  async setAdmin(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
    @Query('isAdmin') isAdmin: string,
  ) {
    return this.groupService.setAdmin(
      userId,
      groupId,
      memberId,
      isAdmin === 'true',
    );
  }

  /**
   * 转让群主
   */
  @Post(':groupId/transfer')
  async transferOwner(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Body() dto: TransferOwnerDto,
  ) {
    return this.groupService.transferOwner(userId, groupId, dto);
  }

  /**
   * 解散群组
   */
  @Delete(':groupId')
  async dissolveGroup(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.groupService.dissolveGroup(userId, groupId);
  }
}

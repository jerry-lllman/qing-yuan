import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdateGroupDto,
  AddMembersDto,
  UpdateMemberDto,
  TransferOwnerDto,
} from './dto';

@Injectable()
export class GroupService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取群组详情
   */
  async getGroup(userId: string, groupId: string) {
    const group = await this.prisma.conversation.findFirst({
      where: {
        id: groupId,
        type: 'GROUP',
        members: { some: { userId } },
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                nickname: true,
                avatar: true,
                status: true,
              },
            },
          },
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        },
      },
    });

    if (!group) {
      throw new NotFoundException('群组不存在或您不是群成员');
    }

    return this.formatGroup(group);
  }

  /**
   * 更新群组信息（仅群主和管理员）
   */
  async updateGroup(userId: string, groupId: string, dto: UpdateGroupDto) {
    const group = await this.prisma.conversation.findFirst({
      where: {
        id: groupId,
        type: 'GROUP',
      },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('群组不存在');
    }

    const member = group.members[0];
    if (!member) {
      throw new ForbiddenException('您不是群成员');
    }

    // 检查权限：只有群主和管理员可以修改群信息
    if (member.role === 'MEMBER') {
      throw new ForbiddenException('只有群主或管理员可以修改群信息');
    }

    const updated = await this.prisma.conversation.update({
      where: { id: groupId },
      data: {
        name: dto.name,
        avatar: dto.avatar,
        notice: dto.notice,
        updatedAt: new Date(),
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                nickname: true,
                avatar: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return this.formatGroup(updated);
  }

  /**
   * 添加群成员（仅群主和管理员）
   */
  async addMembers(userId: string, groupId: string, dto: AddMembersDto) {
    const group = await this.prisma.conversation.findFirst({
      where: {
        id: groupId,
        type: 'GROUP',
      },
      include: {
        members: true,
      },
    });

    if (!group) {
      throw new NotFoundException('群组不存在');
    }

    const currentMember = group.members.find((m) => m.userId === userId);
    if (!currentMember) {
      throw new ForbiddenException('您不是群成员');
    }

    // 检查权限：只有群主和管理员可以添加成员
    if (currentMember.role === 'MEMBER') {
      throw new ForbiddenException('只有群主或管理员可以添加成员');
    }

    // 过滤已在群里的用户
    const existingUserIds = group.members.map((m) => m.userId);
    const newUserIds = dto.userIds.filter(
      (id) => !existingUserIds.includes(id),
    );

    if (newUserIds.length === 0) {
      throw new BadRequestException('所选用户已全部在群中');
    }

    // 验证用户是否存在
    const users = await this.prisma.user.findMany({
      where: { id: { in: newUserIds } },
    });

    if (users.length !== newUserIds.length) {
      throw new BadRequestException('部分用户不存在');
    }

    // 批量添加成员
    await this.prisma.conversationMember.createMany({
      data: newUserIds.map((uid) => ({
        conversationId: groupId,
        userId: uid,
        role: 'MEMBER',
      })),
    });

    // 更新群的更新时间
    await this.prisma.conversation.update({
      where: { id: groupId },
      data: { updatedAt: new Date() },
    });

    return {
      success: true,
      addedCount: newUserIds.length,
      addedUserIds: newUserIds,
    };
  }

  /**
   * 移除群成员（仅群主和管理员）
   */
  async removeMember(userId: string, groupId: string, targetUserId: string) {
    const group = await this.prisma.conversation.findFirst({
      where: {
        id: groupId,
        type: 'GROUP',
      },
      include: {
        members: true,
      },
    });

    if (!group) {
      throw new NotFoundException('群组不存在');
    }

    const currentMember = group.members.find((m) => m.userId === userId);
    if (!currentMember) {
      throw new ForbiddenException('您不是群成员');
    }

    const targetMember = group.members.find((m) => m.userId === targetUserId);
    if (!targetMember) {
      throw new BadRequestException('目标用户不在群中');
    }

    // 不能移除自己（应该用退出群聊）
    if (userId === targetUserId) {
      throw new BadRequestException('不能移除自己，请使用退出群聊功能');
    }

    // 不能移除群主
    if (targetMember.role === 'OWNER') {
      throw new ForbiddenException('不能移除群主');
    }

    // 权限检查
    if (currentMember.role === 'MEMBER') {
      throw new ForbiddenException('只有群主或管理员可以移除成员');
    }

    // 管理员不能移除其他管理员
    if (currentMember.role === 'ADMIN' && targetMember.role === 'ADMIN') {
      throw new ForbiddenException('管理员不能移除其他管理员');
    }

    // 删除成员
    await this.prisma.conversationMember.delete({
      where: { id: targetMember.id },
    });

    return { success: true, removedUserId: targetUserId };
  }

  /**
   * 更新成员信息（群昵称、角色）
   */
  async updateMember(
    userId: string,
    groupId: string,
    targetUserId: string,
    dto: UpdateMemberDto,
  ) {
    const group = await this.prisma.conversation.findFirst({
      where: {
        id: groupId,
        type: 'GROUP',
      },
      include: {
        members: true,
      },
    });

    if (!group) {
      throw new NotFoundException('群组不存在');
    }

    const currentMember = group.members.find((m) => m.userId === userId);
    if (!currentMember) {
      throw new ForbiddenException('您不是群成员');
    }

    const targetMember = group.members.find((m) => m.userId === targetUserId);
    if (!targetMember) {
      throw new BadRequestException('目标用户不在群中');
    }

    // 更新自己的群昵称，任何人都可以
    if (userId === targetUserId && dto.nickname !== undefined && !dto.role) {
      const updated = await this.prisma.conversationMember.update({
        where: { id: targetMember.id },
        data: { nickname: dto.nickname },
      });
      return updated;
    }

    // 修改角色需要群主权限
    if (dto.role !== undefined) {
      if (currentMember.role !== 'OWNER') {
        throw new ForbiddenException('只有群主可以修改成员角色');
      }

      // 不能修改群主的角色
      if (targetMember.role === 'OWNER') {
        throw new ForbiddenException('不能修改群主的角色');
      }

      // 不能设置其他人为群主（应该用转让群主功能）
      if (dto.role === 'OWNER') {
        throw new BadRequestException('请使用转让群主功能');
      }
    }

    // 修改他人信息需要管理员权限
    if (userId !== targetUserId && currentMember.role === 'MEMBER') {
      throw new ForbiddenException('只有群主或管理员可以修改他人信息');
    }

    const updated = await this.prisma.conversationMember.update({
      where: { id: targetMember.id },
      data: {
        nickname: dto.nickname,
        role: dto.role,
      },
    });

    return updated;
  }

  /**
   * 转让群主
   */
  async transferOwner(userId: string, groupId: string, dto: TransferOwnerDto) {
    const group = await this.prisma.conversation.findFirst({
      where: {
        id: groupId,
        type: 'GROUP',
      },
      include: {
        members: true,
      },
    });

    if (!group) {
      throw new NotFoundException('群组不存在');
    }

    // 检查当前用户是否是群成员
    const currentMember = group.members.find((m) => m.userId === userId);
    if (!currentMember) {
      throw new NotFoundException('群组不存在或您不是群成员');
    }

    // 只有群主才能转让
    if (group.ownerId !== userId) {
      throw new ForbiddenException('只有群主可以转让群组');
    }

    const newOwnerMember = group.members.find(
      (m) => m.userId === dto.newOwnerId,
    );
    if (!newOwnerMember) {
      throw new BadRequestException('新群主必须是群成员');
    }

    // 使用事务更新
    await this.prisma.$transaction([
      // 更新群的 ownerId
      this.prisma.conversation.update({
        where: { id: groupId },
        data: {
          ownerId: dto.newOwnerId,
          updatedAt: new Date(),
        },
      }),
      // 设置新群主的角色
      this.prisma.conversationMember.update({
        where: { id: newOwnerMember.id },
        data: { role: 'OWNER' },
      }),
      // 将原群主降为管理员
      this.prisma.conversationMember.update({
        where: { id: currentMember.id },
        data: { role: 'ADMIN' },
      }),
    ]);

    return { success: true, newOwnerId: dto.newOwnerId };
  }

  /**
   * 解散群组（仅群主）
   */
  async dissolveGroup(userId: string, groupId: string) {
    const group = await this.prisma.conversation.findFirst({
      where: {
        id: groupId,
        type: 'GROUP',
      },
      include: {
        members: true,
      },
    });

    if (!group) {
      throw new NotFoundException('群组不存在');
    }

    // 检查当前用户是否是群成员
    const currentMember = group.members.find((m) => m.userId === userId);
    if (!currentMember) {
      throw new NotFoundException('群组不存在或您不是群成员');
    }

    // 只有群主才能解散
    if (group.ownerId !== userId) {
      throw new ForbiddenException('只有群主可以解散群组');
    }

    // 使用事务删除群组相关数据
    await this.prisma.$transaction([
      // 删除所有消息的已读回执
      this.prisma.messageReadReceipt.deleteMany({
        where: {
          message: { conversationId: groupId },
        },
      }),
      // 删除所有消息的附件
      this.prisma.attachment.deleteMany({
        where: {
          message: { conversationId: groupId },
        },
      }),
      // 删除所有消息
      this.prisma.message.deleteMany({
        where: { conversationId: groupId },
      }),
      // 删除所有成员
      this.prisma.conversationMember.deleteMany({
        where: { conversationId: groupId },
      }),
      // 删除群组
      this.prisma.conversation.delete({
        where: { id: groupId },
      }),
    ]);

    return { success: true, dissolvedGroupId: groupId };
  }

  /**
   * 获取群成员列表
   */
  async getMembers(userId: string, groupId: string) {
    // 验证用户是群成员
    const member = await this.prisma.conversationMember.findFirst({
      where: { conversationId: groupId, userId },
    });

    if (!member) {
      throw new ForbiddenException('您不是群成员');
    }

    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId: groupId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
            status: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      nickname: m.nickname,
      joinedAt: m.joinedAt,
      user: m.user,
    }));
  }

  /**
   * 设置/取消管理员
   */
  async setAdmin(
    userId: string,
    groupId: string,
    targetUserId: string,
    isAdmin: boolean,
  ) {
    const group = await this.prisma.conversation.findFirst({
      where: {
        id: groupId,
        type: 'GROUP',
      },
      include: {
        members: true,
      },
    });

    if (!group) {
      throw new NotFoundException('群组不存在');
    }

    // 检查当前用户是否是群成员
    const currentMember = group.members.find((m) => m.userId === userId);
    if (!currentMember) {
      throw new NotFoundException('群组不存在或您不是群成员');
    }

    // 只有群主可以设置管理员
    if (group.ownerId !== userId) {
      throw new ForbiddenException('只有群主可以设置管理员');
    }

    const targetMember = group.members.find((m) => m.userId === targetUserId);
    if (!targetMember) {
      throw new BadRequestException('目标用户不在群中');
    }

    if (targetMember.role === 'OWNER') {
      throw new ForbiddenException('不能修改群主的角色');
    }

    const newRole = isAdmin ? 'ADMIN' : 'MEMBER';

    const updated = await this.prisma.conversationMember.update({
      where: { id: targetMember.id },
      data: { role: newRole },
    });

    return {
      success: true,
      userId: targetUserId,
      role: updated.role,
    };
  }

  /**
   * 格式化群组数据
   */
  private formatGroup(group: any) {
    return {
      id: group.id,
      type: group.type,
      name: group.name,
      avatar: group.avatar,
      notice: group.notice,
      ownerId: group.ownerId,
      owner: group.owner,
      memberCount: group.members?.length || 0,
      members: group.members?.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        nickname: m.nickname,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }
}

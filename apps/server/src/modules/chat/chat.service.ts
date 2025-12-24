import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma';
import {
  CreatePrivateChatDto,
  CreateGroupDto,
  UpdateConversationDto,
} from './dto';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建或获取私聊会话
   */
  async createOrGetPrivateChat(userId: string, dto: CreatePrivateChatDto) {
    // 不能和自己聊天
    if (userId === dto.targetUserId) {
      throw new BadRequestException('不能和自己创建会话');
    }

    // 检查目标用户是否存在
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('用户不存在');
    }

    // 查找已存在的私聊会话
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        type: 'PRIVATE',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: dto.targetUserId } } },
        ],
      },
      include: {
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

    if (existingConversation) {
      return this.formatConversation(existingConversation, userId);
    }

    // 创建新的私聊会话
    const conversation = await this.prisma.conversation.create({
      data: {
        type: 'PRIVATE',
        members: {
          create: [{ userId }, { userId: dto.targetUserId }],
        },
      },
      include: {
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

    return this.formatConversation(conversation, userId);
  }

  /**
   * 创建群聊
   */
  async createGroup(userId: string, dto: CreateGroupDto) {
    // 去重并添加创建者
    const memberIds = [...new Set([userId, ...dto.memberIds])];

    // 检查成员是否存在
    const users = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
    });

    if (users.length !== memberIds.length) {
      throw new BadRequestException('部分用户不存在');
    }

    // 创建群聊
    const conversation = await this.prisma.conversation.create({
      data: {
        type: 'GROUP',
        name: dto.name,
        avatar: dto.avatar,
        ownerId: userId,
        members: {
          create: memberIds.map((id) => ({
            userId: id,
            role: id === userId ? 'OWNER' : 'MEMBER',
          })),
        },
      },
      include: {
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
        owner: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    return conversation;
  }

  /**
   * 获取用户的会话列表
   */
  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
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
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return conversations.map(
      (conv: Awaited<ReturnType<typeof this.prisma.conversation.findFirst>>) =>
        this.formatConversation(conv!, userId),
    );
  }

  /**
   * 获取会话详情
   */
  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        members: { some: { userId } },
      },
      include: {
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
        owner: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('会话不存在');
    }

    return this.formatConversation(conversation, userId);
  }

  /**
   * 更新会话设置
   */
  async updateConversation(
    userId: string,
    conversationId: string,
    dto: UpdateConversationDto,
  ) {
    const member = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId },
    });

    if (!member) {
      throw new ForbiddenException('非会话成员');
    }

    const updated = await this.prisma.conversationMember.update({
      where: { id: member.id },
      data: dto,
    });

    return updated;
  }

  /**
   * 退出会话
   */
  async leaveConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });

    if (!conversation) {
      throw new NotFoundException('会话不存在');
    }

    const member = conversation.members.find(
      (m: { userId: string }) => m.userId === userId,
    );
    if (!member) {
      throw new ForbiddenException('非会话成员');
    }

    // 私聊不能退出
    if (conversation.type === 'PRIVATE') {
      throw new BadRequestException('私聊会话不能退出');
    }

    // 群主不能直接退出，需要先转让
    if (conversation.ownerId === userId) {
      throw new BadRequestException('群主请先转让群组');
    }

    await this.prisma.conversationMember.delete({
      where: { id: member.id },
    });

    return { success: true };
  }

  /**
   * 删除会话（仅对当前用户隐藏，不删除消息）
   */
  async deleteConversation(userId: string, conversationId: string) {
    const member = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId },
    });

    if (!member) {
      throw new ForbiddenException('非会话成员');
    }

    // 对于私聊，只是将 lastReadAt 设置为 null 表示已删除
    // 实际上可以增加一个 deletedAt 字段来标记
    await this.prisma.conversationMember.update({
      where: { id: member.id },
      data: { lastReadAt: null },
    });

    return { success: true };
  }

  /**
   * 格式化会话数据
   * 转换为前端期望的 PrivateConversation / GroupConversation 格式
   */
  private formatConversation(conversation: any, currentUserId: string) {
    const currentMember = conversation.members.find(
      (m: any) => m.userId === currentUserId,
    );
    const lastMessage = conversation.messages?.[0] || null;

    // 对于私聊，返回对方的信息作为会话信息
    if (conversation.type === 'PRIVATE') {
      const otherMember = conversation.members.find(
        (m: any) => m.userId !== currentUserId,
      );
      return {
        id: conversation.id,
        type: 'private' as const, // 转为小写以匹配客户端类型
        name: null, // 私聊会话 name 为 null，用 participant 显示
        avatar: null, // 私聊会话 avatar 为 null，用 participant.avatar 显示
        participant: otherMember?.user, // 使用 participant 而非 targetUser
        isMuted: currentMember?.isMuted || false,
        isPinned: currentMember?.isPinned || false,
        lastMessage,
        unreadCount: 0, // 需要单独计算
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      };
    }

    // 群聊
    return {
      id: conversation.id,
      type: 'group' as const, // 转为小写以匹配客户端类型
      name: conversation.name,
      avatar: conversation.avatar,
      ownerId: conversation.ownerId,
      announcement: conversation.notice || null, // 使用 announcement 而非 notice
      memberCount: conversation.members.length,
      isMuted: currentMember?.isMuted || false,
      isPinned: currentMember?.isPinned || false,
      lastMessage,
      unreadCount: 0,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }
}

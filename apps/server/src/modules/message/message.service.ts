import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { SendMessageDto } from './dto';

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  /**
   * 发送消息
   */
  async sendMessage(userId: string, dto: SendMessageDto) {
    // 检查用户是否是会话成员
    const member = await this.prisma.conversationMember.findFirst({
      where: {
        conversationId: dto.conversationId,
        userId,
      },
    });

    if (!member) {
      throw new ForbiddenException('非会话成员');
    }

    // 创建消息
    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderId: userId,
        type: dto.type,
        content: dto.content,
        replyToId: dto.replyToId,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
            status: true,
            email: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
            sender: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
        },
        attachments: true,
      },
    });

    // 更新会话的更新时间
    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  /**
   * 获取会话的消息历史
   * @param userId 当前用户 ID
   * @param conversationId 会话 ID
   * @param options.before 获取在此消息之前的消息 ID
   * @param options.after 获取在此消息之后的消息 ID
   * @param options.limit 获取的消息数量限制
   */
  async getMessages(
    userId: string,
    conversationId: string,
    options: { before?: string; after?: string; limit?: number } = {},
  ) {
    const { before, after, limit = 50 } = options;

    // 检查用户是否是会话成员
    const member = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId },
    });

    if (!member) {
      throw new ForbiddenException('非会话成员');
    }

    // 构建查询条件
    const where: any = {
      conversationId,
      isDeleted: false,
    };

    if (before) {
      const beforeMessage = await this.prisma.message.findUnique({
        where: { id: before },
      });
      if (beforeMessage) {
        where.createdAt = { lt: beforeMessage.createdAt };
      }
    }

    if (after) {
      const afterMessage = await this.prisma.message.findUnique({
        where: { id: after },
      });
      if (afterMessage) {
        where.createdAt = { gt: afterMessage.createdAt };
      }
    }

    const messages = await this.prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
            status: true,
            email: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
            sender: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
        },
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // 返回格式化的响应（包含 hasMore 标志）
    const sortedMessages = messages.reverse(); // 返回正序
    return {
      messages: sortedMessages,
      hasMore: messages.length >= limit,
    };
  }

  /**
   * 编辑消息
   */
  async editMessage(userId: string, messageId: string, content: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('消息不存在');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('只能编辑自己的消息');
    }

    if (message.isDeleted) {
      throw new ForbiddenException('消息已删除');
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
            status: true,
            email: true,
          },
        },
        attachments: true,
      },
    });

    return updated;
  }

  /**
   * 删除消息（软删除）
   */
  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('消息不存在');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('只能删除自己的消息');
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true },
    });

    return { success: true, messageId };
  }

  /**
   * 标记消息为已读
   */
  async markAsRead(userId: string, conversationId: string, messageId: string) {
    // 检查用户是否是会话成员
    const member = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId },
    });

    if (!member) {
      throw new ForbiddenException('非会话成员');
    }

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.conversationId !== conversationId) {
      throw new NotFoundException('消息不存在');
    }

    // 更新成员的最后阅读时间
    await this.prisma.conversationMember.update({
      where: { id: member.id },
      data: { lastReadAt: new Date() },
    });

    // 创建已读回执
    await this.prisma.messageReadReceipt.upsert({
      where: {
        messageId_userId: { messageId, userId },
      },
      update: { readAt: new Date() },
      create: { messageId, userId },
    });

    return { success: true };
  }

  /**
   * 获取会话成员列表（用于广播消息）
   */
  async getConversationMemberIds(conversationId: string): Promise<string[]> {
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });

    return members.map((m: { userId: string }) => m.userId);
  }
}

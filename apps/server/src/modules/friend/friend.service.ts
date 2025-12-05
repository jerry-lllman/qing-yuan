import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { SendFriendRequestDto, UpdateFriendDto } from './dto';

@Injectable()
export class FriendService {
  constructor(private prisma: PrismaService) {}

  /**
   * 发送好友请求
   */
  async sendFriendRequest(senderId: string, dto: SendFriendRequestDto) {
    // 不能添加自己
    if (senderId === dto.receiverId) {
      throw new BadRequestException('不能添加自己为好友');
    }

    // 检查接收者是否存在
    const receiver = await this.prisma.user.findUnique({
      where: { id: dto.receiverId },
    });
    if (!receiver) {
      throw new NotFoundException('用户不存在');
    }

    // 检查是否已经是好友
    const existingFriendship = await this.prisma.friendship.findUnique({
      where: {
        // 在 prisma 中定义了
        // apps/server/prisma/schema.prisma  -> model Friendship -> @@unique([userId, friendId])
        // 所以这里可以直接用复合唯一索引来查询
        userId_friendId: {
          userId: senderId,
          friendId: dto.receiverId,
        },
      },
    });
    if (existingFriendship) {
      throw new ConflictException('已经是好友了');
    }

    // 检查是否已发送过请求
    const existingRequest = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId: dto.receiverId, status: 'PENDING' },
          { senderId: dto.receiverId, receiverId: senderId, status: 'PENDING' },
        ],
      },
    });
    if (existingRequest) {
      // 如果对方已经向我发送了请求，直接接受
      if (existingRequest.senderId === dto.receiverId) {
        return this.acceptFriendRequest(senderId, existingRequest.id);
      }
      throw new ConflictException('好友请求已存在');
    }

    // 创建好友请求
    const request = await this.prisma.friendRequest.create({
      data: {
        senderId,
        receiverId: dto.receiverId,
        message: dto.message,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    return request;
  }

  /**
   * 获取收到的好友请求
   */
  async getReceivedRequests(userId: string) {
    const requests = await this.prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
            bio: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests;
  }

  /**
   * 获取发送的好友请求
   */
  async getSentRequests(userId: string) {
    const requests = await this.prisma.friendRequest.findMany({
      where: {
        senderId: userId,
        status: 'PENDING',
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests;
  }

  /**
   * 接受好友请求
   */
  async acceptFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('好友请求不存在');
    }

    if (request.receiverId !== userId) {
      throw new BadRequestException('无权操作此请求');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('请求已处理');
    }

    // 使用事务创建双向好友关系
    const [, , friendship] = await this.prisma.$transaction([
      // 更新请求状态
      this.prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
      }),
      // 创建双向好友关系
      this.prisma.friendship.createMany({
        data: [
          { userId: request.senderId, friendId: request.receiverId },
          { userId: request.receiverId, friendId: request.senderId },
        ],
      }),
      // 返回好友关系
      this.prisma.friendship.findFirst({
        where: {
          userId,
          friendId: request.senderId,
        },
        include: {
          friend: {
            select: {
              id: true,
              username: true,
              nickname: true,
              avatar: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return friendship;
  }

  /**
   * 拒绝好友请求
   */
  async rejectFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('好友请求不存在');
    }

    if (request.receiverId !== userId) {
      throw new BadRequestException('无权操作此请求');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('请求已处理');
    }

    await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    return { success: true };
  }

  /**
   * 获取好友列表
   */
  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: { userId },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
            bio: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return friendships.map((f: (typeof friendships)[number]) => ({
      id: f.id,
      friendId: f.friendId,
      remark: f.remark,
      createdAt: f.createdAt,
      friend: f.friend,
    }));
  }

  /**
   * 更新好友信息（备注）
   */
  async updateFriend(userId: string, friendId: string, dto: UpdateFriendDto) {
    const friendship = await this.prisma.friendship.findUnique({
      where: {
        userId_friendId: { userId, friendId },
      },
    });

    if (!friendship) {
      throw new NotFoundException('好友关系不存在');
    }

    const updated = await this.prisma.friendship.update({
      where: { id: friendship.id },
      data: dto,
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
            status: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * 删除好友
   */
  async deleteFriend(userId: string, friendId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: {
        userId_friendId: { userId, friendId },
      },
    });

    if (!friendship) {
      throw new NotFoundException('好友关系不存在');
    }

    // 删除双向好友关系
    await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    return { success: true };
  }

  /**
   * 检查是否是好友
   */
  async isFriend(userId: string, targetId: string): Promise<boolean> {
    const friendship = await this.prisma.friendship.findUnique({
      where: {
        userId_friendId: { userId, friendId: targetId },
      },
    });

    return !!friendship;
  }
}

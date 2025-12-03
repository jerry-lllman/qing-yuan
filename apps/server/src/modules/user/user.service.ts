import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { UpdateProfileDto, UpdateSettingsDto } from './dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取用户信息
   */
  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        nickname: true,
        avatar: true,
        bio: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        bio: true,
        status: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  /**
   * 搜索用户
   */
  async search(keyword: string, currentUserId: string, limit = 20) {
    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } }, // 排除当前用户
          {
            OR: [
              { username: { contains: keyword, mode: 'insensitive' } },
              { nickname: { contains: keyword, mode: 'insensitive' } },
              { email: { equals: keyword, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        bio: true,
        status: true,
      },
      take: limit,
    });

    return users;
  }

  /**
   * 更新用户资料
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        nickname: true,
        avatar: true,
        bio: true,
        status: true,
      },
    });

    return user;
  }

  /**
   * 获取用户设置
   */
  async getSettings(userId: string) {
    let settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    // 如果没有设置，创建默认设置
    if (!settings) {
      settings = await this.prisma.userSettings.create({
        data: { userId },
      });
    }

    return settings;
  }

  /**
   * 更新用户设置
   */
  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    const settings = await this.prisma.userSettings.upsert({
      where: { userId },
      update: dto,
      create: {
        userId,
        ...dto,
      },
    });

    return settings;
  }

  /**
   * 更新用户在线状态
   */
  async updateStatus(
    userId: string,
    status: 'ONLINE' | 'OFFLINE' | 'AWAY' | 'BUSY' | 'INVISIBLE',
  ) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }
}

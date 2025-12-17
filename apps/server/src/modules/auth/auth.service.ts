import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * 用户注册
   */
  async register(dto: RegisterDto) {
    // 检查用户名是否已存在
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUsername) {
      throw new ConflictException('用户名已被使用');
    }

    // 检查邮箱是否已存在
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('邮箱已被使用');
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
        nickname: dto.nickname,
        settings: {
          create: {}, // 创建默认设置
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        avatar: true,
        status: true,
        createdAt: true,
      },
    });

    // 生成令牌
    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.email,
    );

    return {
      user,
      tokens,
    };
  }

  /**
   * 用户登录
   */
  async login(dto: LoginDto) {
    // 根据用户名或邮箱查找用户
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.account }, { email: dto.account }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 更新用户在线状态
    await this.prisma.user.update({
      where: { id: user.id },
      data: { status: 'ONLINE' },
    });

    // 生成令牌
    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.email,
    );

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        status: 'ONLINE',
      },
      tokens,
    };
  }

  /**
   * 刷新令牌
   */
  async refreshTokens(dto: RefreshTokenDto) {
    // 查找刷新令牌
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
    });

    if (!storedToken) {
      throw new UnauthorizedException('无效的刷新令牌');
    }

    // 检查是否过期
    if (new Date() > storedToken.expiresAt) {
      // 删除过期令牌
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      throw new UnauthorizedException('刷新令牌已过期');
    }

    // 获取用户信息
    const user = await this.prisma.user.findUnique({
      where: { id: storedToken.userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 删除旧的刷新令牌
    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    // 生成新令牌
    return this.generateTokens(user.id, user.username, user.email);
  }

  /**
   * 退出登录
   */
  async logout(userId: string, refreshToken?: string) {
    // 更新用户状态为离线
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'OFFLINE' },
    });

    // 如果提供了刷新令牌，则删除
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    return { success: true };
  }

  /**
   * 生成访问令牌和刷新令牌
   */
  private async generateTokens(
    userId: string,
    username: string,
    email: string,
  ) {
    const payload: JwtPayload = {
      sub: userId,
      username,
      email,
    };

    const accessExpiresIn = this.configService.get<string>(
      'jwt.accessExpiresIn',
      '15m',
    );
    const refreshExpiresIn = this.configService.get<string>(
      'jwt.refreshExpiresIn',
      '7d',
    );

    // 生成访问令牌
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: accessExpiresIn,
    });

    // 生成刷新令牌
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: refreshExpiresIn,
    });

    // 计算过期时间
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 天后过期

    // 存储刷新令牌
    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}

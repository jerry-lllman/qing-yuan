import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { PrismaService } from '../../../prisma';
import { JwtPayload } from '../strategies/jwt.strategy';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractTokenFromSocket(client);

    if (!token) {
      throw new UnauthorizedException('未提供认证令牌');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          username: true,
          email: true,
          nickname: true,
          avatar: true,
          status: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      // 将用户信息附加到 socket
      client.data.user = user;

      return true;
    } catch {
      throw new UnauthorizedException('无效的认证令牌');
    }
  }

  private extractTokenFromSocket(client: Socket): string | undefined {
    // 从 handshake auth 中获取
    const authToken = client.handshake.auth?.token;
    if (authToken) {
      return authToken;
    }

    // 从 handshake headers 中获取
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // 从 query 参数中获取
    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string') {
      return queryToken;
    }

    return undefined;
  }
}

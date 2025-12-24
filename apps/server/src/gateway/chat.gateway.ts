import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MessageService } from '../modules/message/message.service';
import { SendMessageDto } from '../modules/message/dto';

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: string;
      username: string;
      nickname: string;
      avatar: string | null;
    };
  };
}

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // 用户 ID -> Socket ID 映射（支持多设备）
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private messageService: MessageService,
  ) {}

  /**
   * 客户端连接
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      // 验证 token
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      // 获取用户信息
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          username: true,
          nickname: true,
          avatar: true,
        },
      });

      if (!user) {
        client.disconnect();
        return;
      }

      // 存储用户信息
      client.data.user = user;

      // 添加到用户 socket 映射
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(client.id);

      // 加入用户专属房间
      client.join(`user:${user.id}`);

      // 加入用户所有会话的房间
      const conversations = await this.prisma.conversationMember.findMany({
        where: { userId: user.id },
        select: { conversationId: true },
      });
      conversations.forEach((conv: { conversationId: string }) => {
        client.join(`conversation:${conv.conversationId}`);
      });

      // 更新用户在线状态
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: 'ONLINE' },
      });

      // 广播用户上线
      this.server.emit('user:online', { userId: user.id });

      console.log(`User ${user.username} connected (socket: ${client.id})`);
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  /**
   * 客户端断开连接
   */
  async handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data?.user;
    if (!user) return;

    // 从映射中移除
    const sockets = this.userSockets.get(user.id);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(user.id);

        // 用户所有设备都离线，更新状态
        await this.prisma.user.update({
          where: { id: user.id },
          data: { status: 'OFFLINE' },
        });

        // 广播用户离线
        this.server.emit('user:offline', { userId: user.id });
      }
    }

    console.log(`User ${user.username} disconnected (socket: ${client.id})`);
  }

  /**
   * 发送消息
   */
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto,
  ) {
    const user = client.data.user;
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    try {
      const message = await this.messageService.sendMessage(user.id, data);

      // 确保发送者加入会话房间（可能是新创建的会话）
      client.join(`conversation:${data.conversationId}`);

      // 获取会话所有成员，确保他们都能收到消息
      const members = await this.prisma.conversationMember.findMany({
        where: { conversationId: data.conversationId },
        select: { userId: true },
      });

      // 让所有在线成员加入会话房间（针对新会话的情况）
      // 通过向用户专属房间发送消息来通知他们加入会话房间
      for (const member of members) {
        const memberSockets = this.userSockets.get(member.userId);
        if (memberSockets) {
          for (const socketId of memberSockets) {
            // 使用 in() 方法获取 socket 并让其加入房间
            const sockets = await this.server.in(socketId).fetchSockets();
            for (const memberSocket of sockets) {
              memberSocket.join(`conversation:${data.conversationId}`);
            }
          }
        }
      }

      // 广播消息到会话
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('message:receive', message);

      return { success: true, message };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 正在输入
   */
  @SubscribeMessage('message:typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const user = client.data.user;
    if (!user) return;

    // 广播给会话其他成员
    client.to(`conversation:${data.conversationId}`).emit('message:typing', {
      conversationId: data.conversationId,
      userId: user.id,
      nickname: user.nickname,
    });
  }

  /**
   * 停止输入
   */
  @SubscribeMessage('message:typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const user = client.data.user;
    if (!user) return;

    client
      .to(`conversation:${data.conversationId}`)
      .emit('message:typing:stop', {
        conversationId: data.conversationId,
        userId: user.id,
      });
  }

  /**
   * 标记消息已读
   */
  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
    const user = client.data.user;
    if (!user) return;

    try {
      await this.messageService.markAsRead(
        user.id,
        data.conversationId,
        data.messageId,
      );

      // 通知消息发送者
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('message:read:receipt', {
          conversationId: data.conversationId,
          messageId: data.messageId,
          userId: user.id,
          readAt: new Date(),
        });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 加入会话房间（创建新会话后调用）
   */
  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const user = client.data.user;
    if (!user) return;

    // 验证是否是会话成员
    const member = await this.prisma.conversationMember.findFirst({
      where: {
        conversationId: data.conversationId,
        userId: user.id,
      },
    });

    if (member) {
      client.join(`conversation:${data.conversationId}`);
      return { success: true };
    }

    return { success: false, error: 'Not a member' };
  }

  /**
   * 工具方法：提取 token
   */
  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (authToken) return authToken;

    const authHeader = client.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string') return queryToken;

    return undefined;
  }

  /**
   * 工具方法：向指定用户发送消息
   */
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * 工具方法：向会话广播消息
   */
  broadcastToConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { configuration, validate } from './config';
import { PrismaModule } from './prisma';
import { AuthModule, JwtAuthGuard } from './modules/auth';
import { UserModule } from './modules/user';
import { FriendModule } from './modules/friend';
import { ChatModule } from './modules/chat';
import { MessageModule } from './modules/message';
import { GroupModule } from './modules/group';
import { GatewayModule } from './gateway';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: ['.env.local', '.env'],
    }),
    // 数据库模块
    PrismaModule,
    // 认证模块
    AuthModule,
    // 用户模块
    UserModule,
    // 好友模块
    FriendModule,
    // 会话模块
    ChatModule,
    // 消息模块
    MessageModule,
    // 群组模块
    GroupModule,
    // WebSocket 网关
    GatewayModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 全局认证守卫
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

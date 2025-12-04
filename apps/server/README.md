# @cyan/server

Qing-Yuan 即时通讯应用的后端服务，基于 Nest.js 构建。

## 技术栈

- **框架**: Nest.js v11
- **数据库**: PostgreSQL + Prisma ORM
- **实时通信**: Socket.io (WebSocket)
- **认证**: JWT + Passport
- **验证**: class-validator + class-transformer
- **测试**: Vitest

## 项目结构

```
src/
├── config/                 # 配置模块
│   ├── configuration.ts    # 应用配置
│   └── validation.ts       # 环境变量验证
├── gateway/                # WebSocket 网关
│   └── chat.gateway.ts     # 聊天网关
├── modules/
│   ├── auth/               # 认证模块 (登录/注册/JWT)
│   ├── user/               # 用户模块 (个人信息/设置)
│   ├── friend/             # 好友模块 (好友请求/关系)
│   ├── chat/               # 会话模块 (私聊/群聊)
│   ├── message/            # 消息模块 (发送/同步)
│   └── group/              # 群组模块 (群管理)
├── prisma/                 # Prisma 服务
├── app.module.ts           # 根模块
└── main.ts                 # 应用入口
```

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- PostgreSQL >= 14
- Redis >= 6 (可选，用于缓存)

### 安装依赖

```bash
# 在项目根目录
pnpm install
```

### 环境配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置数据库连接等
```

环境变量说明：

| 变量                  | 说明                   | 默认值        |
| --------------------- | ---------------------- | ------------- |
| `NODE_ENV`            | 运行环境               | `development` |
| `PORT`                | 服务端口               | `3000`        |
| `DATABASE_URL`        | PostgreSQL 连接字符串  | -             |
| `REDIS_URL`           | Redis 连接字符串       | -             |
| `JWT_SECRET`          | JWT 密钥               | -             |
| `JWT_ACCESS_EXPIRES`  | Access Token 过期时间  | `15m`         |
| `JWT_REFRESH_EXPIRES` | Refresh Token 过期时间 | `7d`          |

### 数据库初始化

```bash
# 生成 Prisma Client
pnpm db:generate

# 运行数据库迁移
pnpm db:migrate

# 打开 Prisma Studio（可选）
pnpm db:studio
```

### 启动服务

```bash
# 开发模式（热重载）
pnpm dev

# 生产模式
pnpm build
pnpm start:prod
```

服务启动后访问：`http://localhost:3000`

## API 规范

### 基础信息

- **前缀**: `/api`
- **版本**: `/v1`
- **完整基础路径**: `/api/v1`

### 认证

除公开接口外，所有请求需在 Header 中携带 JWT：

```
Authorization: Bearer <access_token>
```

### 主要接口

| 模块    | 路径               | 说明                   |
| ------- | ------------------ | ---------------------- |
| Auth    | `/api/v1/auth`     | 登录、注册、刷新 Token |
| User    | `/api/v1/users`    | 用户信息、设置         |
| Friend  | `/api/v1/friends`  | 好友请求、好友列表     |
| Chat    | `/api/v1/chats`    | 会话列表、创建会话     |
| Message | `/api/v1/messages` | 消息发送、历史记录     |
| Group   | `/api/v1/groups`   | 群组管理               |

## WebSocket

### 连接

```typescript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3000/chat', {
  auth: {
    token: 'your-jwt-token',
  },
});
```

### 主要事件

| 事件              | 方向            | 说明         |
| ----------------- | --------------- | ------------ |
| `message:send`    | Client → Server | 发送消息     |
| `message:receive` | Server → Client | 接收消息     |
| `message:read`    | Client → Server | 标记已读     |
| `user:online`     | Server → Client | 用户上线通知 |
| `user:offline`    | Server → Client | 用户离线通知 |
| `typing:start`    | Client → Server | 正在输入     |
| `typing:stop`     | Client → Server | 停止输入     |

## 数据模型

### 核心模型

- **User**: 用户信息
- **UserSettings**: 用户设置
- **UserDevice**: 用户设备（多设备支持）
- **Friendship**: 好友关系
- **FriendRequest**: 好友请求
- **Conversation**: 会话（私聊/群聊）
- **ConversationMember**: 会话成员
- **Message**: 消息
- **MessageReadReceipt**: 消息已读回执
- **Attachment**: 附件

### 枚举类型

- `UserStatus`: ONLINE | OFFLINE | AWAY | BUSY | INVISIBLE
- `ConversationType`: PRIVATE | GROUP
- `MemberRole`: OWNER | ADMIN | MEMBER
- `MessageType`: TEXT | IMAGE | FILE | VOICE | VIDEO | SYSTEM
- `FriendRequestStatus`: PENDING | ACCEPTED | REJECTED

## 开发命令

```bash
# 开发
pnpm dev              # 启动开发服务器
pnpm start:debug      # 调试模式

# 构建
pnpm build            # 构建生产版本

# 测试
pnpm test             # 运行单元测试
pnpm test:watch       # 监听模式
pnpm test:cov         # 生成覆盖率报告
pnpm test:e2e         # 运行 E2E 测试

# 代码质量
pnpm lint             # ESLint 检查
pnpm lint:fix         # 自动修复
pnpm typecheck        # TypeScript 类型检查

# 数据库
pnpm db:generate      # 生成 Prisma Client
pnpm db:migrate       # 运行迁移
pnpm db:migrate:prod  # 生产环境迁移
pnpm db:push          # 推送 Schema 变更
pnpm db:studio        # 打开 Prisma Studio
```

## 依赖关系

```
@qing-yuan/shared     # 共享类型定义
       ↓
@qing-yuan/protocol   # 通信协议
       ↓
    @cyan/server      # 本服务
```

## 安全注意事项

- ⚠️ 生产环境务必修改 `JWT_SECRET`
- ⚠️ 所有外部输入必须经过验证
- ⚠️ 敏感信息不要提交到代码仓库
- ⚠️ 服务端不解密端到端加密消息

## 相关文档

- [项目架构文档](../../docs/ARCHITECTURE.md)
- [开发计划](../../docs/DEVELOPMENT_PLAN.md)
- [Prisma 文档](https://www.prisma.io/docs)
- [Nest.js 文档](https://docs.nestjs.com)

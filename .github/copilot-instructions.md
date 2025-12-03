# Copilot 开发指令 - Qing-Yuan 即时通讯应用

> 本文档为 GitHub Copilot 提供项目上下文和开发规范,确保生成的代码符合项目标准

---

## 项目概述

**Qing-Yuan** 是一款支持 iOS、Android、PC 的即时通讯软件,采用 TypeScript 全栈开发,使用 pnpm + Turborepo 构建 monorepo 架构。

### 核心特性

- 端到端加密 (Signal Protocol)
- 实时消息同步 (WebSocket)
- 多设备支持
- 离线消息队列
- 文件分片上传

---

## 技术栈

### 前端

- **桌面端**: Electron + Vite + React
- **移动端**: React Native (iOS & Android)
- **状态管理**: Zustand + TanStack Query
- **样式方案**: Tailwind CSS (Web) / NativeWind (Native)
- **组件库**: shadcn/ui (Web) / Gluestack UI v3 (Native)

### 后端

- **框架**: Nest.js
- **数据库**: PostgreSQL + Prisma ORM
- **实时通信**: Socket.io
- **缓存**: Redis

### 工具链

- **包管理器**: pnpm (必须使用,不要用 npm/yarn)
- **构建工具**: Turborepo
- **类型验证**: Zod
- **工具函数**: radash (现代化的实用工具库)
- **加密**: @aspect-build/libsignal-client

---

## Monorepo 结构

```
cyan/
├── apps/                  # 应用层
│   ├── desktop/          # Electron 桌面应用
│   ├── mobile/           # React Native 移动应用
│   └── server/           # Nest.js 后端服务
│
├── packages/             # 库层
│   ├── shared/          # 零依赖纯 TS 逻辑
│   ├── protocol/        # 通信协议定义
│   ├── client-core/     # 客户端核心 (API + Socket + Storage)
│   ├── client-state/    # 状态管理
│   ├── encryption/      # 端到端加密
│   ├── ui-web/          # Web UI 组件库
│   ├── ui-native/       # Native UI 组件库
│   └── testing/         # 测试工具包
```

### 包依赖关系

**关键原则**: 依赖关系必须单向,遵循以下层级:

```
shared (零依赖，纯 TS 逻辑)
  ↓
protocol → encryption
  ↓           ↓
  └─→ client-core ←┘
        ↓
    client-state
        ↓
   ┌────┴────┐
ui-web    ui-native
   ↓          ↓
desktop    mobile
```

**重要约束**:

- `shared` 包不能依赖任何外部 npm 包（零依赖）
- `ui-web` 和 `ui-native` 不能相互依赖
- `server` 只依赖 `shared` + `protocol`（不解密消息）
- 所有包通过 `shared` 共享类型定义

---

## 代码规范

### 命名约定

| 类型      | 规范                 | 示例                      |
| --------- | -------------------- | ------------------------- |
| 文件      | kebab-case           | `message-sync.ts`         |
| 组件文件  | PascalCase           | `ChatBubble.tsx`          |
| 类型/接口 | PascalCase           | `MessagePayload`, `IUser` |
| 变量/函数 | camelCase            | `sendMessage`, `userId`   |
| 常量      | SCREAMING_SNAKE_CASE | `MAX_MESSAGE_LENGTH`      |
| 枚举      | PascalCase           | `MessageEvent`            |
| 枚举值    | SCREAMING_SNAKE_CASE | `SEND`, `RECEIVE`         |
| 私有属性  | \_camelCase          | `_socket`, `_cache`       |

### 文件组织

#### React 组件目录结构

```
ComponentName/
├── index.ts                    # 导出入口
├── ComponentName.tsx           # 组件实现
├── ComponentName.test.tsx      # 测试文件
├── types.ts                    # 组件专属类型
└── hooks.ts                    # 组件专属 hooks (如需要)
```

#### 包结构

```
packages/package-name/
├── src/
│   ├── index.ts               # 主导出
│   ├── types/                 # 类型定义
│   ├── utils/                 # 工具函数
│   └── [功能模块]/
├── package.json
├── tsconfig.json
└── README.md
```

### TypeScript 规范

#### 严格模式配置

- 所有包必须启用 `strict: true`
- 公共 API 必须明确标注类型
- **禁止使用 `any`**（特殊情况用 `unknown`）
- 优先使用 `interface` 而非 `type`（除非需要联合/交叉类型）

#### 类型定义示例

```typescript
// ✅ 正确示例
import { z } from 'zod';

// 1. 定义接口
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: Date;
}

// 2. 定义 Zod schema（用于运行时验证）
export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  email: z.string().email(),
  avatar: z.string().url().optional(),
  createdAt: z.coerce.date(),
});

// 3. 从 schema 推导类型（确保类型和验证一致）
export type UserPayload = z.infer<typeof userSchema>;

// 4. 函数签名明确
export async function createUser(data: UserPayload): Promise<User> {
  const validated = userSchema.parse(data);
  return api.post('/users', validated);
}
```

```typescript
// ❌ 错误示例
export const createUser = (data: any) => {
  // 禁止用 any
  return fetch('/api/users', { body: data }); // 没有类型验证
};

export function getUser(id) {
  // 缺少类型标注
  return api.get(`/users/${id}`);
}
```

---

## 包依赖管理

### 添加依赖前的检查清单

**CRITICAL**: 在添加任何 npm 包之前,必须完成以下步骤:

#### 1. 查询最新稳定版本

```bash
# 查询包的基本信息
pnpm info <package-name>

# 查看所有版本列表
pnpm info <package-name> versions

# 查看最新版本
pnpm info <package-name> version

# 查看包的周下载量（判断流行度）
pnpm info <package-name> | grep downloads
```

#### 2. 检查兼容性

- ✅ 确认与 React 18+ / React Native 0.72+ 兼容
- ✅ 检查是否支持目标平台 (Web/iOS/Android/Node.js)
- ✅ 查看 bundle size 影响: https://bundlephobia.com
- ✅ 检查是否有类型定义 (@types/\*)
- ✅ 查看 GitHub stars、最近更新时间、issues 数量

#### 3. 使用 pnpm catalog 统一管理

编辑 `pnpm-workspace.yaml`:

```yaml
catalog:
  # 核心框架（锁定主版本号）
  react: ^18.2.0
  react-dom: ^18.2.0
  typescript: ^5.3.0

  # 状态管理
  zustand: ^4.5.0
  '@tanstack/react-query': ^5.17.0

  # 工具库
  radash: ^12.1.0
  zod: ^3.22.0
```

#### 4. 添加依赖的命令

```bash
# 添加到特定 workspace
pnpm add <package>@latest --filter @cyan/client-state

# 添加开发依赖
pnpm add -D <package>@latest --filter @cyan/client-state

# 添加到根工作区（工具类依赖）
pnpm add -D <package>@latest -w

# 验证依赖树
pnpm why <package-name>

# 检查是否有重复依赖
pnpm list <package-name>
```

### 依赖版本锁定策略

| 环境         | 版本策略     | 示例     | 说明                          |
| ------------ | ------------ | -------- | ----------------------------- |
| **开发阶段** | `latest`     | `^1.2.3` | 快速迭代，及时获取新特性      |
| **测试环境** | 锁定次版本   | `~1.2.0` | 只接受补丁更新                |
| **生产环境** | 锁定具体版本 | `1.2.3`  | 完全锁定，使用 pnpm-lock.yaml |

### 禁止使用的包

❌ **绝对禁止**:

- `moment` (已废弃，用 `date-fns` 或原生 `Intl`)
- `request` (已废弃，用 `axios` 或 `fetch`)
- 完整的 `lodash` (用 `radash` 或原生 JS)

❌ **避免使用**:

- 体积过大的库（检查 bundlephobia）
- 长期无维护的包（1年以上无更新）
- 有安全漏洞的包（运行 `pnpm audit`）

### radash 使用指南

radash 是本项目推荐的工具函数库（替代 lodash）:

```typescript
// packages/shared/src/utils/index.ts
import {
  debounce,
  throttle,
  retry,
  sleep,
  parallel,
  defer,
  unique,
  group,
  pick,
  omit,
} from 'radash';

// ✅ 推荐使用场景

// 1. 防抖/节流
export const debouncedSearch = debounce({ delay: 300 }, (query: string) => {
  return api.search(query);
});

// 2. 重试机制
export async function fetchWithRetry<T>(fn: () => Promise<T>) {
  return retry({ times: 3, delay: 1000 }, fn);
}

// 3. 并行执行
export async function loadAllChats(userIds: string[]) {
  return parallel(5, userIds, async (userId) => {
    return api.getChat(userId);
  });
}

// 4. 数组操作
export const uniqueUsers = unique(users, (u) => u.id);
export const groupedMessages = group(messages, (m) => m.conversationId);

// 5. 对象操作
export const userBasic = pick(user, ['id', 'name', 'avatar']);
export const userWithoutPassword = omit(user, ['password', 'salt']);
```

**原生 JS vs radash 选择原则**:

```typescript
// ✅ 简单操作用原生 JS
const filtered = users.filter((u) => u.active);
const mapped = users.map((u) => u.name);
const unique = [...new Set(ids)];

// ✅ 复杂操作用 radash
const grouped = group(messages, (m) => m.conversationId);
const debounced = debounce({ delay: 300 }, handler);
const result = await retry({ times: 3 }, asyncFn);
```

---

## 组件库使用规范

### Web 端 (shadcn/ui)

shadcn/ui 采用 **copy-paste** 模式,组件代码在项目内部:

```typescript
// ✅ 正确: 从本地路径导入
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Dialog } from '@/components/ui/dialog';

// ❌ 错误: 不存在 npm 包
import { Button } from '@shadcn/ui'; // 没有这个包!
import { Button } from 'shadcn-ui'; // 也不对!
```

**添加新组件**:

```bash
cd packages/ui-web
npx shadcn-ui@latest add button
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add dialog
```

### Native 端 (Gluestack UI v3)

Gluestack UI v3 同样采用 **copy-paste** 模式:

```typescript
// ✅ 正确: 从本地路径导入
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';

// ❌ 错误: v2 的导入方式已废弃
import { Button } from '@gluestack-ui/themed'; // v2 的方式
```

**添加新组件**:

```bash
cd packages/ui-native
npx gluestack-ui add button
npx gluestack-ui add box
npx gluestack-ui add text
```

---

## 状态管理规范

### Zustand Store 设计

- 每个 Store 负责单一领域
- 使用 `immer` 中间件简化不可变更新
- Store 文件必须以 `.store.ts` 结尾
- 导出明确的接口类型

```typescript
// packages/client-state/src/stores/message.store.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import type { Message } from '@cyan/shared';

interface MessageState {
  messages: Map<string, Message[]>;
  pendingMessages: Message[];

  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;
}

export const useMessageStore = create<MessageState>()(
  devtools(
    immer((set) => ({
      messages: new Map(),
      pendingMessages: [],

      addMessage: (conversationId, message) =>
        set((state) => {
          const existing = state.messages.get(conversationId) || [];
          state.messages.set(conversationId, [...existing, message]);
        }),

      updateMessage: (messageId, updates) =>
        set((state) => {
          for (const [id, messages] of state.messages) {
            const index = messages.findIndex((m) => m.id === messageId);
            if (index !== -1) {
              Object.assign(messages[index], updates);
              break;
            }
          }
        }),
    })),
    { name: 'MessageStore' }
  )
);
```

### TanStack Query

- 用于服务端数据的缓存和同步
- Query key 使用工厂函数统一管理

```typescript
// packages/client-state/src/queries/user.queries.ts
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

export function useUser(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => api.users.getById(userId),
    staleTime: 5 * 60 * 1000,
  });
}
```

---

## WebSocket 事件规范

### 事件定义

```typescript
// packages/protocol/src/events/message.events.ts
export enum MessageEvent {
  // 客户端 -> 服务端
  SEND = 'message:send',
  EDIT = 'message:edit',
  DELETE = 'message:delete',

  // 服务端 -> 客户端
  RECEIVE = 'message:receive',
  DELIVERED = 'message:delivered',
  UPDATED = 'message:updated',
}
```

### Payload 验证

```typescript
// packages/protocol/src/schemas/message.schema.ts
export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  type: z.enum(['text', 'image', 'file', 'voice', 'video']),
});

export type SendMessagePayload = z.infer<typeof sendMessageSchema>;
```

---

## 后端开发规范 (Nest.js)

### Controller 示例

```typescript
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  @Get('sync')
  @Version('1')
  async syncMessages(
    @Query('conversationId') conversationId: string,
    @Query('after') after?: string
  ) {
    return this.messageService.syncMessages(conversationId, after);
  }
}
```

### Gateway 示例

```typescript
@WebSocketGateway({ namespace: 'chat' })
export class ChatGateway {
  @SubscribeMessage(MessageEvent.SEND)
  @UseGuards(WsAuthGuard)
  async handleSendMessage(
    @MessageBody() payload: SendMessagePayload,
    @ConnectedSocket() client: Socket
  ) {
    const validated = sendMessageSchema.parse(payload);
    const message = await this.messageService.create(validated);

    // 广播给会话成员
    const recipientIds = await this.getConversationMembers(validated.conversationId);
    for (const recipientId of recipientIds) {
      this.server.to(`user:${recipientId}`).emit(MessageEvent.RECEIVE, message);
    }

    return { success: true, messageId: message.id };
  }
}
```

---

## 测试规范

### 覆盖率要求

| 类型           | 最低覆盖率 |
| -------------- | ---------- |
| `packages/*`   | 80%        |
| `apps/server`  | 70%        |
| `apps/desktop` | 60%        |
| `apps/mobile`  | 60%        |

### 测试示例

```typescript
// packages/client-core/src/sync/message-sync.test.ts
import { describe, it, expect, vi } from 'vitest';
import { MessageSyncManager } from './message-sync';

describe('MessageSyncManager', () => {
  it('should sync incremental messages', async () => {
    const mockApi = { get: vi.fn().mockResolvedValue({ messages: [] }) };
    const syncManager = new MessageSyncManager(mockApi);

    const result = await syncManager.syncIncremental({
      conversationId: 'conv-1',
      lastMessageId: 'msg-0',
      lastSyncTime: Date.now(),
    });

    expect(mockApi.get).toHaveBeenCalledWith('/messages/sync', {
      params: expect.objectContaining({ conversationId: 'conv-1' }),
    });
  });
});
```

---

## Git 提交规范

### Commit 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档变更
- `style`: 代码格式
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具变更

### Scope 范围

- `desktop`, `mobile`, `server`
- `shared`, `protocol`, `client-core`, `client-state`
- `ui-web`, `ui-native`, `encryption`

### 示例

```
feat(client-core): add offline message queue

- Implement OfflineQueue class
- Add automatic retry on network recovery
- Store pending messages in local storage

Closes #123
```

---

## 安全规范

### 1. 敏感信息管理

```typescript
// ❌ 禁止硬编码
const JWT_SECRET = 'my-secret-key';

// ✅ 使用环境变量
const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error('Missing JWT_SECRET');
```

### 2. 输入验证

所有外部输入必须使用 Zod 验证:

```typescript
@Post('login')
async login(@Body(new ZodValidationPipe(loginSchema)) payload: LoginPayload) {
  return this.authService.login(payload)
}
```

### 3. 端到端加密

消息内容必须端到端加密（使用 Signal Protocol）

---

## 性能优化

### 前端优化

- **虚拟滚动**: 消息列表使用 `@tanstack/react-virtual`
- **图片懒加载**: 使用 Intersection Observer
- **代码分割**: 路由级别的 lazy loading

### 后端优化

- **数据库索引**: 频繁查询的字段建索引
- **Redis 缓存**: 热点数据缓存
- **连接池**: 配置合理的连接池大小

---

## 错误处理

### 客户端

```typescript
try {
  await api.messages.send(payload);
} catch (error) {
  if (error instanceof NetworkError) {
    await offlineQueue.enqueue(payload);
    toast.error('消息将在网络恢复后发送');
  } else if (error instanceof ValidationError) {
    toast.error(error.message);
  } else {
    ErrorReporter.captureException(error);
    toast.error('操作失败，请重试');
  }
}
```

### 服务端

使用 Nest.js Exception Filters 统一处理错误

---

## 监控与日志

### 客户端错误上报

```typescript
import * as Sentry from '@sentry/react';

ErrorReporter.init({ dsn: process.env.SENTRY_DSN });
ErrorReporter.captureException(error, { userId, conversationId });
```

### 性能监控

```typescript
const measure = PerformanceMonitor.measureMessageLatency(messageId);
await sendMessage(payload);
measure.end();
```

---

## 构建与部署

```bash
# 构建所有应用
pnpm build

# 构建特定应用
pnpm build --filter @cyan/desktop

# 开发模式
pnpm dev --filter @cyan/desktop

# 测试
pnpm test

# 代码检查
pnpm lint
pnpm typecheck
```

---

## 常见问题

**Q: 为什么必须使用 pnpm?**
A: 严格的依赖管理，避免幽灵依赖，monorepo 性能更好。

**Q: shadcn/ui 和 Gluestack UI 没有 npm 包?**
A: 采用 copy-paste 模式，使用 CLI 工具复制组件代码到项目中。

**Q: 为什么 `shared` 包零依赖?**
A: 它是最底层的包，被所有其他包依赖，避免依赖复杂度激增。

**Q: radash 和 lodash 有什么区别?**
A: radash 专为 TypeScript 设计，API 更现代，支持 async/await，体积更小。

**Q: 如何查询 npm 包的最新版本?**
A: `pnpm info <package-name> version` 或访问 npmjs.com

---

## 开发流程检查清单

### 开始编码前

- [ ] 了解任务所属的模块和包
- [ ] 检查现有代码的实现模式
- [ ] 查询并确认依赖包的最新稳定版本
- [ ] 创建对应的类型定义
- [ ] 编写 Zod schema 验证（如涉及 API/WebSocket）

### 编码时

- [ ] 遵循命名约定
- [ ] 使用 TypeScript 严格模式，避免 `any`
- [ ] 添加必要的注释
- [ ] 处理所有错误情况
- [ ] 考虑性能影响
- [ ] 逐步实现并测试每个功能点，并且告知我，以便我能做 git commit 操作

### 提交前

- [ ] `pnpm lint` 检查代码规范
- [ ] `pnpm typecheck` 确保类型正确
- [ ] `pnpm test` 确保测试通过
- [ ] 编写测试用例（新功能必须有测试）
- [ ] 遵循 Git commit 规范
- [ ] 确保没有提交敏感信息

---

## 参考链接

- [项目架构文档](../docs/ARCHITECTURE.md)
- [Turborepo 文档](https://turbo.build/repo/docs)
- [pnpm Workspace](https://pnpm.io/workspaces)
- [Nest.js 文档](https://docs.nestjs.com/)
- [Prisma 文档](https://www.prisma.io/docs)
- [Zustand 文档](https://docs.pmnd.rs/zustand)
- [TanStack Query](https://tanstack.com/query/latest)
- [shadcn/ui 文档](https://ui.shadcn.com/)
- [Gluestack UI 文档](https://gluestack.io/)
- [radash 文档](https://radash-docs.vercel.app/)
- [Zod 文档](https://zod.dev/)

---

_文档版本: 1.0.0_
_最后更新: 2025-12-03_
_维护者: Qing-Yuan Team_

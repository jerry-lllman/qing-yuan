# Copilot 开发指令 - Qing-Yuan 即时通讯应用

> 本文档为 GitHub Copilot 提供项目约束和开发规范

---

## 项目概述

**Qing-Yuan** - TypeScript 全栈即时通讯应用，pnpm + Turborepo monorepo 架构

**核心特性**: 端到端加密 (Signal) | 实时同步 (WebSocket) | 多设备 | 离线队列

**技术栈**:
- 前端: Electron + React | React Native | Zustand + TanStack Query | Tailwind/NativeWind
- 后端: Nest.js + PostgreSQL + Prisma + Socket.io + Redis
- 工具: pnpm (必须) | Turborepo | Zod | radash | @aspect-build/libsignal-client

---

## Monorepo 结构与依赖约束

### 目录结构

```
qing-yuan/
├── apps/           # 应用层
│   ├── desktop/    # Electron
│   ├── mobile/     # React Native
│   └── server/     # Nest.js
└── packages/       # 库层
    ├── shared/        # ⚠️ 零依赖纯 TS
    ├── protocol/      # 通信协议
    ├── client-core/   # API + Socket + Storage
    ├── client-state/  # 状态管理
    ├── encryption/    # E2E 加密
    ├── ui-web/        # Web UI
    ├── ui-native/     # Native UI
    └── testing/       # 测试工具
```

### 🚨 依赖关系图（必须遵守）

```
shared (零依赖)
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

### ⚠️ 硬性约束

- `shared` 包 **零依赖**（不能有任何 npm 包）
- `ui-web` 和 `ui-native` **禁止相互依赖**
- `server` 只依赖 `shared` + `protocol`（**不解密消息**）
- 所有类型定义通过 `shared` 共享

---

## 代码规范

### 命名约定

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件 | kebab-case | `message-sync.ts` |
| 组件文件 | PascalCase | `ChatBubble.tsx` |
| 类型/接口 | PascalCase | `MessagePayload` |
| 变量/函数 | camelCase | `sendMessage` |
| 常量 | SCREAMING_SNAKE_CASE | `MAX_LENGTH` |
| 枚举 | PascalCase | `MessageEvent` |
| 枚举值 | SCREAMING_SNAKE_CASE | `SEND` |
| 私有属性 | _camelCase | `_socket` |

### 文件组织

```
ComponentName/
├── index.ts
├── ComponentName.tsx
├── ComponentName.test.tsx
├── types.ts
└── hooks.ts (可选)
```

### TypeScript 严格规则

- ✅ 必须 `strict: true`
- ✅ 公共 API 必须明确类型
- 🚨 **禁止 `any`**（用 `unknown`）
- ✅ 优先 `interface` 而非 `type`（除非联合/交叉类型）

### 类型定义模式

```typescript
// 1. 定义接口
export interface User {
  id: string;
  name: string;
  createdAt: Date;
}

// 2. Zod schema（运行时验证）
export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  createdAt: z.coerce.date(),
});

// 3. 从 schema 推导类型
export type UserPayload = z.infer<typeof userSchema>;

// 4. 函数签名明确
export async function createUser(data: UserPayload): Promise<User> {
  return userSchema.parse(data);
}
```

---

## 依赖管理

### 添加依赖前必须

1. **查询版本**: `pnpm info <package> version`
2. **检查兼容性**: React 18+ / RN 0.72+ / 目标平台支持
3. **检查体积**: https://bundlephobia.com
4. **检查维护**: GitHub stars / 最近更新 / issues

### 命令

```bash
pnpm add <pkg>@latest --filter @qing-yuan/client-state
pnpm add -D <pkg>@latest -w  # 根工作区
pnpm why <pkg>               # 验证依赖树
```

### 🚨 禁止使用

- `moment` (用 `date-fns` 或原生 `Intl`)
- `request` (用 `axios` 或 `fetch`)
- 完整 `lodash` (用 `radash` 或原生 JS)
- 体积过大的库
- 1年以上无更新的包

### radash 使用原则

```typescript
// ✅ 简单操作用原生 JS
const filtered = users.filter(u => u.active);

// ✅ 复杂操作用 radash
import { debounce, retry, parallel, group } from 'radash';
```

---

## 组件库规范

### 🚨 重要：shadcn/ui 和 Gluestack UI 采用 **copy-paste** 模式

```typescript
// ✅ Web (shadcn/ui) - 从本地导入
import { Button } from '@/components/ui/button';

// ❌ 错误 - 不存在这个 npm 包！
import { Button } from '@shadcn/ui';
import { Button } from 'shadcn-ui';

// ✅ Native (Gluestack UI v3) - 从本地导入
import { Button } from '@/components/ui/button';

// ❌ 错误 - v2 已废弃
import { Button } from '@gluestack-ui/themed';
```

**添加组件**:
```bash
cd packages/ui-web && npx shadcn-ui@latest add button
cd packages/ui-native && npx gluestack-ui add button
```

---

## 状态管理模式

### Zustand Store

```typescript
// ✅ 必须: immer + devtools + 明确接口 + .store.ts 后缀
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';

interface MessageState {
  messages: Map<string, Message[]>;
  addMessage: (id: string, msg: Message) => void;
}

export const useMessageStore = create<MessageState>()(
  devtools(immer((set) => ({ /* ... */ })), { name: 'MessageStore' })
);
```

### TanStack Query

```typescript
// ✅ Query key 工厂函数
export const userKeys = {
  all: ['users'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};
```

---

## WebSocket 事件规范

```typescript
// 枚举事件
export enum MessageEvent {
  SEND = 'message:send',      // 客户端 -> 服务端
  RECEIVE = 'message:receive', // 服务端 -> 客户端
}

// Zod 验证 Payload
export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  type: z.enum(['text', 'image', 'file']),
});
```

---

## 后端规范 (Nest.js)

```typescript
// Controller
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  @Get('sync')
  async syncMessages(@Query('conversationId') id: string) {
    return this.messageService.sync(id);
  }
}

// Gateway - 必须验证 Payload
@WebSocketGateway({ namespace: 'chat' })
export class ChatGateway {
  @SubscribeMessage(MessageEvent.SEND)
  @UseGuards(WsAuthGuard)
  async handleSend(@MessageBody() payload: SendMessagePayload) {
    const validated = sendMessageSchema.parse(payload); // 必须验证
    // ...
  }
}
```

---

## 测试规范

### 覆盖率要求

| 类型 | 最低覆盖率 |
|------|-----------|
| `packages/*` | 80% |
| `apps/server` | 70% |
| `apps/desktop` | 60% |
| `apps/mobile` | 60% |

---

## Git 提交规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**: feat | fix | docs | style | refactor | perf | test | chore

**Scope**: desktop | mobile | server | shared | protocol | client-core | client-state | ui-web | ui-native | encryption

---

## 安全规范

```typescript
// 🚨 禁止硬编码密钥
const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error('Missing JWT_SECRET');

// ✅ 所有外部输入必须 Zod 验证
const validated = schema.parse(payload);

// ✅ 消息必须端到端加密 (Signal Protocol)
```

---

## 性能优化

- **虚拟滚动**: `@tanstack/react-virtual`
- **图片懒加载**: Intersection Observer
- **代码分割**: 路由级 lazy loading
- **数据库索引**: 频繁查询字段
- **Redis 缓存**: 热点数据

---

## 错误处理

```typescript
// ✅ 客户端错误处理模式
try {
  await api.send(payload);
} catch (error) {
  if (error instanceof NetworkError) {
    await offlineQueue.enqueue(payload);
  } else if (error instanceof ValidationError) {
    toast.error(error.message);
  } else {
    ErrorReporter.captureException(error);
  }
}
```

---

## 构建命令

```bash
pnpm build                              # 所有应用
pnpm build --filter @qing-yuan/desktop  # 特定应用
pnpm dev --filter @qing-yuan/desktop
pnpm test && pnpm lint && pnpm typecheck
```

---

## 关键问答

**Q: 为什么必须用 pnpm?**
A: 严格依赖管理，避免幽灵依赖，monorepo 性能更好

**Q: shadcn/ui 没有 npm 包?**
A: copy-paste 模式，用 CLI 复制组件到项目

**Q: 为什么 `shared` 零依赖?**
A: 最底层包，被所有包依赖，避免依赖爆炸

---

## 开发检查清单

### 编码前
- [ ] 了解任务所属模块和包
- [ ] 检查现有代码模式
- [ ] 确认依赖版本和兼容性
- [ ] 创建类型定义和 Zod schema

### 编码时
- [ ] 遵循命名约定
- [ ] 禁止使用 `any`
- [ ] 处理所有错误情况
- [ ] **逐步实现并测试，及时告知以便 git commit**

### 提交前
- [ ] `pnpm lint && pnpm typecheck && pnpm test`
- [ ] 编写测试用例（新功能必须）
- [ ] 遵循 Git commit 规范
- [ ] 无敏感信息

---

_版本: 2.0.0 | 最后更新: 2025-12-04_

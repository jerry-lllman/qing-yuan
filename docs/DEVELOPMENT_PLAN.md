# Qing-Yuan 开发计划

> 项目开发进度追踪与计划

---

## 目录

1. [进度概览](#进度概览)
2. [Phase 1: 基础设施搭建](#phase-1-基础设施搭建)
3. [Phase 2: 后端核心开发](#phase-2-后端核心开发)
4. [Phase 3: 加密模块开发](#phase-3-加密模块开发)
5. [Phase 4: 客户端核心层开发](#phase-4-客户端核心层开发)
6. [Phase 5: 状态管理层开发](#phase-5-状态管理层开发)
7. [Phase 6: UI 组件库开发](#phase-6-ui-组件库开发)
8. [Phase 7: 桌面端应用开发](#phase-7-桌面端应用开发)
9. [Phase 8: 移动端应用开发](#phase-8-移动端应用开发)
10. [Phase 9: 测试与优化](#phase-9-测试与优化)
11. [Phase 10: 缓冲与发布](#phase-10-缓冲与发布)
12. [开发注意事项](#开发注意事项)

---

## 进度概览

| Phase | 名称             | 状态      | 进度 |
| ----- | ---------------- | --------- | ---- |
| 1     | 基础设施搭建     | ✅ 已完成 | 100% |
| 2     | 后端核心开发     | ✅ 已完成 | 100% |
| 3     | 加密模块开发     | 🔄 进行中 | 90%  |
| 4     | 客户端核心层开发 | ✅ 已完成 | 100% |
| 5     | 状态管理层开发   | ✅ 已完成 | 100% |
| 6     | UI 组件库开发    | ⏳ 未开始 | 0%   |
| 7     | 桌面端应用开发   | ⏳ 未开始 | 0%   |
| 8     | 移动端应用开发   | ⏳ 未开始 | 0%   |
| 9     | 测试与优化       | ⏳ 未开始 | 0%   |
| 10    | 缓冲与发布       | ⏳ 未开始 | 0%   |

**图例**：✅ 已完成 | 🔄 进行中 | ⏳ 未开始 | ❌ 阻塞

---

## Phase 1: 基础设施搭建

**状态**: ✅ 已完成  
**实际耗时**: Week 1-2

| 序号 | 任务                                      | 状态 | 备注                                               |
| ---- | ----------------------------------------- | ---- | -------------------------------------------------- |
| 1.1  | 初始化 monorepo 结构，配置 pnpm workspace | ✅   |                                                    |
| 1.2  | 配置 Turborepo 构建编排                   | ✅   |                                                    |
| 1.3  | 创建 `packages/typescript-config`         | ✅   | 包含 base, library, node, react, react-native 配置 |
| 1.4  | 创建 `packages/eslint-config`             | ✅   | 包含 base, node, react 配置                        |
| 1.5  | 创建 `packages/prettier-config`           | ✅   |                                                    |
| 1.6  | 创建 `packages/shared` 基础类型定义       | ✅   | 零依赖，包含 types, constants, utils               |
| 1.7  | 创建 `packages/protocol` WebSocket 事件   | ✅   | 包含 events, payloads, schemas (Zod)               |
| 1.8  | 配置 CI/CD 流水线                         | ⏳   | 待后续配置                                         |

---

## Phase 2: 后端核心开发

**状态**: ✅ 已完成  
**实际耗时**: Week 3-6  
**测试覆盖**: 107 个 e2e 测试全部通过

| 序号 | 任务                             | 状态 | 备注                                  |
| ---- | -------------------------------- | ---- | ------------------------------------- |
| 2.1  | 初始化 Nest.js 项目结构          | ✅   |                                       |
| 2.2  | 配置 Prisma + 数据库连接         | ✅   | PostgreSQL                            |
| 2.3  | 设计并实现数据库 Schema          | ✅   | User, Friend, Chat, Message, Group 等 |
| 2.4  | 实现 `auth` 模块 (JWT + Refresh) | ✅   | 包含注册、登录、Token 刷新            |
| 2.5  | 实现 `user` 模块                 | ✅   | 用户信息 CRUD                         |
| 2.6  | 实现 `friend` 模块               | ✅   | 好友请求、接受、拒绝、删除            |
| 2.7  | 实现 `chat` 模块                 | ✅   | 私聊会话管理                          |
| 2.8  | 实现 `group` 模块                | ✅   | 群组 CRUD、成员管理、权限控制         |
| 2.9  | 实现 `message` 模块              | ✅   | 消息存储与检索                        |
| 2.10 | 实现 WebSocket 网关              | ✅   | Socket.io 集成                        |
| 2.11 | 实现 `file` 模块                 | ⏳   | 待后续开发                            |
| 2.12 | 实现 `notification` 模块         | ⏳   | 待后续开发                            |

### Phase 2 开发记录

- **修复的问题**:
  1. Group 模块 DTO 验证：`@IsUUID('4')` 改为 `@IsString()`（因为使用 cuid 格式）
  2. Group 模块权限检查：`setAdmin`, `transferOwner`, `dissolveGroup` 先检查成员身份再检查所有者权限

---

## Phase 3: 加密模块开发

**状态**: 🔄 进行中 (核心功能完成，剩余高级特性)  
**预计耗时**: Week 5-7  
**测试覆盖**: 56 个单元测试通过 (21 keys + 13 session + 22 stores)

| 序号 | 任务                            | 状态 | 备注                                                  |
| ---- | ------------------------------- | ---- | ----------------------------------------------------- |
| 3.1  | 创建 `packages/encryption` 结构 | ✅   | tsup + vitest 配置                                    |
| 3.2  | 实现密钥生成与管理              | ✅   | Identity Key, Pre-Keys, Signed Pre-Key, Kyber Pre-Key |
| 3.3  | 实现会话管理 (X3DH)             | ✅   | SignalSessionManager, 内存存储实现                    |
| 3.4  | 实现 Double Ratchet 算法集成    | ✅   | 通过 @signalapp/libsignal-client                      |
| 3.5  | 实现消息加解密流程              | ✅   | encrypt/decrypt 方法，支持 PreKey 和 Whisper 消息     |
| 3.6  | 实现持久化存储适配器            | ✅   | PersistentSignalSessionManager, 5 个 Store 类         |
| 3.7  | 实现服务端密钥交换接口          | ✅   | KeyController, KeyService, 12 个 e2e 测试通过         |
| 3.8  | 编写加密模块单元测试            | ✅   | 56 个测试通过 (21 keys + 13 session + 22 stores)      |

### Phase 3 技术要点

- **使用 `@signalapp/libsignal-client@0.86.6`**（官方 Signal 库）
- **后量子加密支持**: 新版 Signal Protocol 需要 Kyber 密钥
- **密钥类型**:
  - Identity Key: 长期身份密钥
  - Signed Pre-Key: 中期密钥（建议 7 天轮换）
  - Pre-Keys: 一次性预密钥（用于会话建立）
  - Kyber Pre-Key: 后量子加密密钥
- **服务端密钥交换 API**:
  - `POST /keys/upload` - 上传密钥包
  - `POST /keys/prekeys` - 补充一次性预密钥
  - `GET /keys/bundle/:userId` - 获取用户密钥包
  - `GET /keys/status` - 获取当前用户密钥状态

### Phase 3 待完成工作

- [x] 持久化存储适配器（替换内存存储）✅ 2024-12-12
- [x] 服务端密钥交换 API ✅ 2024-12-12
- [ ] 群组加密（Sender Key）
- [ ] 密钥备份与恢复

---

## Phase 4: 客户端核心层开发

**状态**: ✅ 已完成  
**预计耗时**: Week 7-8  
**测试覆盖**: 248 个单元测试通过 (28 API + 29 Socket + 20 Memory + 41 IndexedDB + 36 MMKV + 16 SignalAdapter + 17 EncryptionClient + 27 Sync + 34 OfflineQueue)

| 序号 | 任务                             | 状态 | 备注                                        |
| ---- | -------------------------------- | ---- | ------------------------------------------- |
| 4.1  | 创建 `packages/client-core` 结构 | ✅   | tsup + vitest 配置                          |
| 4.2  | 实现 HTTP API 封装 (Axios)       | ✅   | HttpClient 类，支持拦截器、Token 刷新、重试 |
| 4.3  | 实现 WebSocket 客户端封装        | ✅   | SocketClient 类，支持自动重连、事件监听     |
| 4.4  | 实现存储适配器接口               | ✅   | IStorageAdapter, StorageAdapter 基类        |
| 4.5  | 实现 Web 存储适配器 (IndexedDB)  | ✅   | IndexedDBStorageAdapter, 41 个测试          |
| 4.6  | 实现 Native 存储适配器 (MMKV)    | ✅   | MMKVStorageAdapter, 36 个测试               |
| 4.7  | 集成加密模块到 client-core       | ✅   | EncryptionClient 封装, SignalStorageAdapter |
| 4.8  | 实现消息同步策略                 | ✅   | SyncManager, SyncCursorManager, 27 个测试   |
| 4.9  | 实现离线消息队列                 | ✅   | OfflineQueue, QueueStorage, 34 个测试       |

### Phase 4 技术要点

- **HTTP 客户端** (`HttpClient`):
  - 自动 Token 注入与刷新（401 时自动刷新）
  - 请求/响应拦截器
  - 网络错误、API 错误、认证错误分类
  - 支持静默模式和重试配置
- **WebSocket 客户端** (`SocketClient`):
  - 连接状态管理（`ConnectionStatus` 枚举）
  - 自动重连（指数退避）
  - Token 认证支持
  - 类型安全的事件监听器（基于 `@qing-yuan/protocol` 事件）
  - 消息发送/接收/已读/输入状态等完整功能

---

## Phase 5: 状态管理层开发

**状态**: ✅ 已完成  
**实际耗时**: Week 9-10  
**测试覆盖**: 325 个单元测试通过 (35 auth + 36 chat + 43 contact + 49 message + 22 ui + 25 queries + 14 query-client + 21 use-auth + 30 use-chat + 23 use-message + 27 use-contact)

| 序号 | 任务                              | 状态 | 备注                                                 |
| ---- | --------------------------------- | ---- | ---------------------------------------------------- |
| 5.1  | 创建 `packages/client-state` 结构 | ✅   | tsup + vitest 配置                                   |
| 5.2  | 实现 `auth.store`                 | ✅   | 认证状态、Token 管理、35 个测试                      |
| 5.3  | 实现 `contact.store`              | ✅   | 好友列表、好友请求、在线状态、43 个测试              |
| 5.4  | 实现 `chat.store`                 | ✅   | 会话管理、未读计数、置顶、静音、36 个测试            |
| 5.5  | 实现 `message.store`              | ✅   | 消息管理、分页加载、发送状态、已读状态、49 个测试    |
| 5.6  | 实现 `ui.store`                   | ✅   | 主题、侧边栏、模态框、通知、22 个测试                |
| 5.7  | 实现业务 Hooks                    | ✅   | useAuth, useChat, useMessage, useContact, 101 个测试 |
| 5.8  | 实现 TanStack Query 配置          | ✅   | QueryClient 配置、Key 工厂、39 个测试                |

### Phase 5 技术要点

- **Zustand Store 规范**:
  - 全部使用 `immer` + `devtools` + `persist` 中间件
  - 遵循 `.store.ts` 命名规范
  - 完整的 TypeScript 类型定义
- **Store 架构**:
  - `auth.store`: 用户认证、Token 存储与刷新、登录状态
  - `contact.store`: 好友列表、好友请求（收到/发出）、黑名单、在线状态
  - `chat.store`: 会话列表、当前会话、未读计数、置顶/静音/归档
  - `message.store`: 消息存储（按会话 ID 分组）、发送状态、已读状态、分页
  - `ui.store`: 主题（亮/暗/系统）、侧边栏状态、模态框队列、Toast 通知
- **TanStack Query 集成**:
  - 自定义 `createQueryClient` 配置（重试、缓存时间、GC）
  - Query Key 工厂模式：`userKeys`, `chatKeys`, `messageKeys`, `friendKeys`, `groupKeys`
- **业务 Hooks**:
  - `useAuth`: 认证管理（登录、注销、Token 刷新），21 个测试
  - `useChat`: 会话管理（私聊/群聊、未读计数），30 个测试
  - `useMessage`: 消息管理（发送、接收、分页加载），23 个测试
  - `useContact`: 联系人管理（好友请求、黑名单），27 个测试
  - 辅助 Hooks: `useIsAuthenticated`, `useCurrentUser`, `useConversation`, `useFriend`, `useIsFriend`, `useIsBlocked` 等

---

## Phase 6: UI 组件库开发

**状态**: ⏳ 未开始  
**预计耗时**: Week 9-11

| 序号 | 任务                      | 状态 | 备注             |
| ---- | ------------------------- | ---- | ---------------- |
| 6.1  | 设计 Design Token         | ⏳   | 两端统一设计语言 |
| 6.2  | 配置 shadcn/ui + Tailwind | ⏳   |                  |
| 6.3  | 实现 `ui-web` 基础组件    | ⏳   |                  |
| 6.4  | 实现 `ui-web` 聊天组件    | ⏳   | 自定义实现       |
| 6.5  | 实现 `ui-web` 布局组件    | ⏳   |                  |
| 6.6  | 配置 Gluestack UI         | ⏳   |                  |
| 6.7  | 实现 `ui-native` 基础组件 | ⏳   |                  |
| 6.8  | 实现 `ui-native` 聊天组件 | ⏳   | 自定义实现       |
| 6.9  | 实现 `ui-native` 布局组件 | ⏳   |                  |

---

## Phase 7: 桌面端应用开发

**状态**: ⏳ 未开始  
**预计耗时**: Week 11-13

| 序号 | 任务                        | 状态 | 备注 |
| ---- | --------------------------- | ---- | ---- |
| 7.1  | 初始化 Electron + Vite 项目 | ⏳   |      |
| 7.2  | 配置 electron-vite          | ⏳   |      |
| 7.3  | 实现主进程基础结构          | ⏳   |      |
| 7.4  | 实现 Preload 安全桥接       | ⏳   |      |
| 7.5  | 实现 IPC 通信               | ⏳   |      |
| 7.6  | 实现系统托盘                | ⏳   |      |
| 7.7  | 实现自动更新                | ⏳   |      |
| 7.8  | 实现所有页面                | ⏳   |      |
| 7.9  | 打包配置 (Windows/macOS)    | ⏳   |      |

---

## Phase 8: 移动端应用开发

**状态**: ⏳ 未开始  
**预计耗时**: Week 13-16

| 序号 | 任务                       | 状态 | 备注 |
| ---- | -------------------------- | ---- | ---- |
| 8.1  | 初始化 React Native 项目   | ⏳   |      |
| 8.2  | 配置 Metro (monorepo 兼容) | ⏳   |      |
| 8.3  | 配置 Gluestack UI 主题     | ⏳   |      |
| 8.4  | 实现导航结构               | ⏳   |      |
| 8.5  | 实现原生模块桥接           | ⏳   |      |
| 8.6  | 集成推送通知 (FCM/APNs)    | ⏳   |      |
| 8.7  | 实现生物识别认证           | ⏳   |      |
| 8.8  | 实现后台消息同步           | ⏳   |      |
| 8.9  | 实现所有屏幕               | ⏳   |      |
| 8.10 | iOS 打包配置               | ⏳   |      |
| 8.11 | Android 打包配置           | ⏳   |      |

---

## Phase 9: 测试与优化

**状态**: ⏳ 未开始  
**预计耗时**: Week 16-18

| 序号 | 任务                    | 状态 | 备注 |
| ---- | ----------------------- | ---- | ---- |
| 9.1  | 创建 `packages/testing` | ⏳   |      |
| 9.2  | 编写单元测试            | ⏳   |      |
| 9.3  | 编写集成测试            | ⏳   |      |
| 9.4  | 编写 E2E 测试           | ⏳   |      |
| 9.5  | 性能优化                | ⏳   |      |
| 9.6  | 安全审计                | ⏳   |      |

---

## Phase 10: 缓冲与发布

**状态**: ⏳ 未开始  
**预计耗时**: Week 19-20

| 序号 | 任务                             | 状态 | 备注 |
| ---- | -------------------------------- | ---- | ---- |
| 10.1 | Bug 修复与优化                   | ⏳   |      |
| 10.2 | 全平台集成测试                   | ⏳   |      |
| 10.3 | 文档完善                         | ⏳   |      |
| 10.4 | App Store / Google Play 审核提交 | ⏳   |      |
| 10.5 | 正式发布                         | ⏳   |      |

---

## 开发注意事项

### 🔴 高优先级

1. **Signal Protocol Kyber 密钥要求**
   - 新版 `@signalapp/libsignal-client` 要求 Kyber（后量子）密钥
   - `PreKeyBundle.new()` 需要 11 个参数，包含 `kyberPreKeyId`, `kyberPreKey`, `kyberPreKeySignature`
   - 创建会话时必须提供完整的 Kyber 密钥信息

2. **DTO 验证与数据库 ID 格式**
   - 项目使用 `cuid()` 生成 ID，不是 UUID
   - DTO 中不要使用 `@IsUUID('4')`，使用 `@IsString()` 或自定义验证器
   - 统一 ID 格式验证规则

3. **权限检查顺序**
   - 先检查资源是否存在 → 再检查用户是否有访问权限 → 最后检查操作权限
   - 避免先检查所有者权限导致返回错误的状态码（404 vs 403）

### 🟡 中优先级

4. **加密模块持久化存储**
   - 当前使用内存存储（`InMemory*Store`），仅适合测试
   - 生产环境需要实现持久化适配器：
     - Web: IndexedDB
     - Native: MMKV 或 SQLite
     - Electron: electron-store 或 SQLite

5. **密钥轮换策略**
   - Signed Pre-Key 建议 7 天轮换（`shouldRotateSignedPreKey`）
   - Pre-Keys 使用后应该删除并补充新的
   - Kyber Pre-Key 轮换策略待确定

6. **群组加密**
   - 当前只实现了一对一加密
   - 群组需要使用 Sender Key 机制
   - Signal 库支持 `SenderKeyDistributionMessage`

### 🟢 低优先级

7. **多设备支持**
   - 每个设备需要独立的 `deviceId`
   - 密钥需要在设备间同步或独立生成
   - 考虑设备链接协议

8. **消息同步游标**
   - 使用 `lastMessageId` + `lastSyncTime` 作为同步游标
   - 支持增量同步和全量同步

9. **渐进式会话加载（Progressive Loading）**
   - 首次登录不全量加载所有会话，采用分批加载策略
   - 实现思路：
     - 扩展 `SyncRequestPayload` 添加分页参数：`limit`, `cursor`, `priority`
     - 扩展 `SyncResponsePayload` 添加分页信息：`hasMore`, `nextCursor`
     - 服务端按优先级排序：未读优先 → 置顶优先 → 最近活跃优先
   - 加载策略：
     - 第1批（立即）：最近 10 个会话 + 未读消息会话
     - 第2批（延迟 300ms）：接下来 20 个会话
     - 第3批（按需）：用户滚动时无限加载
   - 配合虚拟滚动（`@tanstack/react-virtual`）+ 骨架屏提升体验
   - 参考：QQ/微信的会话列表加载方式

10. **CI/CD 配置**

- Phase 1.8 待完成
- 需要配置 GitHub Actions
- 包含构建、测试、发布流程

### 📝 代码规范提醒

11. **包命名空间**
    - 统一使用 `@qing-yuan/*`（不是 `@qing-yuan/*`）
    - package.json 中的 name 字段格式：`@qing-yuan/package-name`

12. **组件库使用**
    - shadcn/ui 和 Gluestack UI 都是 copy-paste 模式
    - 不存在 npm 包，从本地 `@/components/ui/` 导入
    - 使用 CLI 添加组件：`npx shadcn-ui add button`

13. **Store 命名**
    - Zustand store 文件使用 `.store.ts` 后缀
    - 必须使用 `immer` + `devtools` 中间件

---

## 更新日志

| 日期       | 更新内容                                                                              |
| ---------- | ------------------------------------------------------------------------------------- |
| 2025-12-16 | 完成 Phase 5.7 业务 Hooks（useAuth, useChat, useMessage, useContact），325 个测试通过 |
| 2025-12-15 | 完成 Phase 5 Zustand Stores 开发，224 个测试通过                                      |
| 2025-12-11 | 完成 Phase 4.1-4.3 客户端核心层（HTTP + WebSocket 封装），57 个测试通过               |
| 2025-12-04 | 完成 Phase 3.1-3.5 加密模块（密钥生成 + 会话管理），34 个测试通过                     |
| 2025-12-03 | 完成 Phase 2 后端开发，107 个 e2e 测试通过；修复 Group 模块 bug                       |
| 2025-12-02 | 完成 Phase 1 基础设施搭建                                                             |

---

_文档版本: 1.3.0_  
_最后更新: 2025-12-16_

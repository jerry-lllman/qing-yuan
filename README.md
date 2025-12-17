# Qyra

多端即时通讯应用，支持 iOS、Android 与桌面端，基于 TypeScript 全栈方案构建，覆盖从端到端加密到实时消息同步的完整链路。【F:docs/ARCHITECTURE.md†L1-L35】【F:docs/DEVELOPMENT_PLAN.md†L24-L37】

## 技术亮点

- **全链路 TypeScript**：前端、后端与共享协议统一使用 TypeScript，方便类型复用与协同开发。【F:docs/ARCHITECTURE.md†L23-L35】【F:docs/DEVELOPMENT_PLAN.md†L48-L56】
- **多端应用**：Electron 桌面端与 React Native 移动端共享状态与协议层，保证一致的实时通讯体验。【F:docs/ARCHITECTURE.md†L43-L92】【F:docs/ARCHITECTURE.md†L196-L230】
- **端到端加密**：内置 Signal Protocol（含后量子 Kyber 密钥）与 Double Ratchet，加密链路已配套服务端密钥交换接口与测试覆盖。【F:docs/DEVELOPMENT_PLAN.md†L90-L119】
- **实时通信与同步**：Socket.io 网关负责消息分发，客户端核心提供消息同步与离线队列能力。【F:docs/ARCHITECTURE.md†L77-L103】【F:docs/ARCHITECTURE.md†L142-L160】
- **Monorepo 工作流**：pnpm + Turborepo 统一管理依赖、构建与脚本，提供共享的 ESLint/Prettier/TS 配置包。【F:docs/DEVELOPMENT_PLAN.md†L48-L57】【F:docs/ARCHITECTURE.md†L247-L262】

## 仓库结构

主要目录概览，详细请参阅 `docs/ARCHITECTURE.md`：

```
apps/            # 可独立运行的应用（desktop、mobile、server）
packages/        # 复用包（shared、protocol、client-core、client-state、encryption、ui-* 等）
docs/            # 架构与开发说明文档
pnpm-workspace.yaml
```

【F:docs/ARCHITECTURE.md†L39-L277】

### 应用层（apps/）

- **desktop**：Electron + Vite + React，渲染层复用 `ui-web` 与 `client-state`。【F:docs/ARCHITECTURE.md†L45-L60】【F:docs/ARCHITECTURE.md†L196-L218】
- **mobile**：React Native（iOS/Android），集成推送、后台任务与生物识别等端上能力。【F:docs/ARCHITECTURE.md†L62-L75】
- **server**：Nest.js 服务，涵盖认证、用户、好友、聊天、群组、消息、文件与通知模块，并提供 WebSocket 网关。【F:docs/ARCHITECTURE.md†L77-L103】

### 库层（packages/）

- **shared**：跨端类型、常量与工具函数的零依赖集合。【F:docs/ARCHITECTURE.md†L104-L123】
- **protocol**：前后端共享的事件定义、载荷类型与 Zod 校验 schema。【F:docs/ARCHITECTURE.md†L124-L140】
- **client-core**：HTTP 客户端、Socket.io 封装、本地存储适配与消息同步策略。【F:docs/ARCHITECTURE.md†L142-L160】
- **client-state**：基于 Zustand 与 TanStack Query 的状态管理与业务 hooks。【F:docs/ARCHITECTURE.md†L162-L180】
- **encryption**：Signal Protocol 实现、密钥/会话管理与加密原语封装。【F:docs/ARCHITECTURE.md†L182-L194】
- **ui-web / ui-native**：Web/Electron 与 React Native 组件库，覆盖基础组件、聊天 UI 与设计令牌/主题。【F:docs/ARCHITECTURE.md†L196-L230】
- **testing**：测试工厂、mocks 与通用测试工具集。【F:docs/ARCHITECTURE.md†L232-L245】
- **配置包**：`typescript-config`、`eslint-config`、`prettier-config` 提供统一的工程配置。【F:docs/ARCHITECTURE.md†L247-L262】

## 快速开始

1. 安装工具：Node.js ≥ 20 与 pnpm ≥ 9（仓库已声明 engine 要求）。【F:package.json†L36-L39】
2. 安装依赖：在仓库根目录执行 `pnpm install`。
3. 启动开发：
   - 统一启动（按 Turborepo pipeline）：`pnpm dev`。【F:package.json†L17-L19】
   - 单独运行子项目：进入对应 app/package 目录按需执行 `pnpm dev` 或等效脚本。
4. 常用脚本：
   - 构建：`pnpm build`
   - 代码检查：`pnpm lint` / `pnpm lint:fix`
   - 格式化：`pnpm format`
   - 测试：`pnpm test` / `pnpm test:coverage`
   - 类型检查：`pnpm typecheck`
   - 清理：`pnpm clean`

## 文档与指南

- 架构与目录详情：`docs/ARCHITECTURE.md`
- 开发计划与进度：`docs/DEVELOPMENT_PLAN.md`
- 认证/JWT 与数据库：`docs/JWT_GUIDE.md`、`docs/PRISMA_GUIDE.md`

欢迎贡献 issue 或 PR，共建高质量的即时通讯体验。

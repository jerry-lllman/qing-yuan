# Prisma Schema 前端开发者指南

> 本文档为前端开发者介绍 Prisma Schema 的核心概念，帮助理解数据库模型定义

---

## 目录

1. [什么是 Prisma](#什么是-prisma)
2. [Schema 文件结构](#schema-文件结构)
3. [数据源配置](#数据源配置)
4. [枚举类型 (enum)](#枚举类型-enum)
5. [模型定义 (model)](#模型定义-model)
6. [字段类型与修饰符](#字段类型与修饰符)
7. [字段属性 (@)](#字段属性-)
8. [模型属性 (@@)](#模型属性-)
9. [关联关系](#关联关系)
10. [实际应用示例](#实际应用示例)

---

## 什么是 Prisma

Prisma 是一个现代化的 **ORM (Object-Relational Mapping)**，让你用 TypeScript/JavaScript 操作数据库，而不需要写原生 SQL。

### 类比前端概念

| 前端概念             | Prisma 对应            |
| -------------------- | ---------------------- |
| TypeScript 接口      | Prisma Model           |
| 类型定义文件 (.d.ts) | schema.prisma          |
| npm install          | prisma migrate         |
| 调用 API             | prisma.user.findMany() |

### Prisma 工作流程

```
schema.prisma  →  prisma migrate  →  数据库表
                       ↓
              prisma generate  →  TypeScript 类型 + 查询客户端
```

---

## Schema 文件结构

```prisma
// 1. 生成器配置 - 告诉 Prisma 生成什么
generator client {
  provider = "prisma-client-js"
}

// 2. 数据源配置 - 连接哪个数据库
datasource db {
  provider = "postgresql"
}

// 3. 枚举定义
enum UserStatus { ... }

// 4. 模型定义
model User { ... }
```

---

## 数据源配置

```prisma
datasource db {
  provider = "postgresql"  // 数据库类型
}
```

### 支持的数据库

| Provider     | 数据库                |
| ------------ | --------------------- |
| `postgresql` | PostgreSQL            |
| `mysql`      | MySQL                 |
| `sqlite`     | SQLite (本地开发常用) |
| `mongodb`    | MongoDB               |
| `sqlserver`  | SQL Server            |

---

## 枚举类型 (enum)

### 定义

```prisma
enum UserStatus {
  ONLINE    // 在线
  OFFLINE   // 离线
  AWAY      // 离开
  BUSY      // 忙碌
  INVISIBLE // 隐身
}
```

### 生成的 TypeScript 类型

```typescript
// Prisma 自动生成
type UserStatus = 'ONLINE' | 'OFFLINE' | 'AWAY' | 'BUSY' | 'INVISIBLE';
```

### 在模型中使用

```prisma
model User {
  status UserStatus @default(OFFLINE)  // 使用枚举作为字段类型
}
```

### 类比前端

```typescript
// 前端定义方式
enum UserStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

// Prisma 定义更简洁，且直接映射到数据库
```

---

## 模型定义 (model)

模型 = 数据库表 = TypeScript 接口

```prisma
/// 用户表 (三斜杠注释会保留到生成的类型中)
model User {
  id       String @id @default(cuid())
  username String @unique
  email    String @unique
  nickname String
}
```

### 生成的 TypeScript 类型

```typescript
// Prisma 自动生成 (node_modules/.prisma/client)
interface User {
  id: string;
  username: string;
  email: string;
  nickname: string;
}
```

---

## 字段类型与修饰符

### 基本类型

| Prisma 类型 | TypeScript 类型 | PostgreSQL 类型    | 说明      |
| ----------- | --------------- | ------------------ | --------- |
| `String`    | `string`        | `TEXT`             | 文本      |
| `Int`       | `number`        | `INTEGER`          | 整数      |
| `Float`     | `number`        | `DOUBLE PRECISION` | 浮点数    |
| `Boolean`   | `boolean`       | `BOOLEAN`          | 布尔值    |
| `DateTime`  | `Date`          | `TIMESTAMP`        | 日期时间  |
| `Json`      | `object`        | `JSONB`            | JSON 数据 |

### 修饰符

| 修饰符 | 含义                 | 示例            |
| ------ | -------------------- | --------------- |
| `?`    | 可选字段 (可为 null) | `phone String?` |
| `[]`   | 数组                 | `tags String[]` |

### 示例

```prisma
model User {
  phone    String?   // 可选，对应 TS: phone: string | null
  avatar   String?   // 可选
  tags     String[]  // 数组，对应 TS: tags: string[]
}
```

---

## 字段属性 (@)

字段属性用 `@` 开头，作用于**单个字段**。

### @id - 主键

```prisma
model User {
  id String @id  // 这个字段是主键（唯一标识）
}
```

类比前端：相当于 React 组件的 `key`，每条数据的唯一标识。

### @default() - 默认值

```prisma
model User {
  // 常用默认值函数
  id        String   @default(cuid())    // 生成唯一 ID
  id        String   @default(uuid())    // 生成 UUID
  createdAt DateTime @default(now())     // 当前时间
  status    UserStatus @default(OFFLINE) // 枚举默认值
  isActive  Boolean  @default(true)      // 布尔默认值
}
```

| 默认值函数        | 说明       | 示例输出                      |
| ----------------- | ---------- | ----------------------------- |
| `cuid()`          | 紧凑唯一ID | `clx1abc2d0000...`            |
| `uuid()`          | 标准UUID   | `550e8400-e29b-41d4-a716-...` |
| `now()`           | 当前时间戳 | `2024-12-04T10:30:00Z`        |
| `autoincrement()` | 自增整数   | `1, 2, 3, ...`                |

### @unique - 唯一约束

```prisma
model User {
  username String @unique  // 用户名不能重复
  email    String @unique  // 邮箱不能重复
  phone    String? @unique // 手机号不能重复（可以为空）
}
```

尝试插入重复值时，数据库会报错。

### @map() - 字段名映射

```prisma
model User {
  createdAt DateTime @map("created_at")  // TS 用 createdAt，数据库用 created_at
  updatedAt DateTime @map("updated_at")
}
```

**为什么需要？**

- TypeScript 习惯：`camelCase` (createdAt)
- 数据库习惯：`snake_case` (created_at)
- `@map` 让两边都满意

```typescript
// 代码中这样写（TypeScript 风格）
const user = await prisma.user.create({
  data: { createdAt: new Date() },
});

// 数据库中存储为 created_at 列
```

### @updatedAt - 自动更新时间

```prisma
model User {
  updatedAt DateTime @updatedAt  // 每次更新记录时自动设置为当前时间
}
```

### @relation() - 定义关联

```prisma
model Message {
  senderId String
  sender   User @relation(fields: [senderId], references: [id])
}
```

详见 [关联关系](#关联关系) 章节。

---

## 模型属性 (@@)

模型属性用 `@@` 开头，作用于**整个模型**。

### @@map() - 表名映射

```prisma
model User {
  // 字段定义...

  @@map("users")  // 模型叫 User，数据库表叫 users
}

model UserSettings {
  @@map("user_settings")  // 模型叫 UserSettings，表叫 user_settings
}
```

**命名对照**：

| Prisma 模型     | 数据库表名        |
| --------------- | ----------------- |
| `User`          | `users`           |
| `UserSettings`  | `user_settings`   |
| `FriendRequest` | `friend_requests` |

### @@index() - 创建索引

```prisma
model User {
  username String
  email    String
  status   UserStatus

  @@index([username])  // 单字段索引
  @@index([email])
  @@index([status])
}
```

**生成的 SQL**：

```sql
CREATE INDEX users_username_idx ON users(username);
CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_status_idx ON users(status);
```

### @@index([a, b]) - 复合索引

```prisma
model Message {
  conversationId String
  createdAt      DateTime

  @@index([conversationId, createdAt])  // 复合索引
}
```

**生成的 SQL**：

```sql
CREATE INDEX messages_conversation_id_created_at_idx
ON messages(conversation_id, created_at);
```

### 单字段索引 vs 复合索引

```prisma
// 3 个独立索引
@@index([username])
@@index([email])
@@index([status])

// 1 个复合索引（字段顺序重要！）
@@index([conversationId, createdAt])
```

**复合索引遵循"最左前缀"原则**：

```sql
-- @@index([conversation_id, created_at]) 的使用情况：

-- ✅ 能用到索引
SELECT * FROM messages WHERE conversation_id = 'xxx';
SELECT * FROM messages WHERE conversation_id = 'xxx' ORDER BY created_at;
SELECT * FROM messages WHERE conversation_id = 'xxx' AND created_at > '2024-01-01';

-- ❌ 无法使用索引（跳过了第一个字段）
SELECT * FROM messages WHERE created_at > '2024-01-01';
SELECT * FROM messages ORDER BY created_at;
```

**何时用复合索引？** 当 WHERE + ORDER BY 经常一起使用时：

```sql
-- 聊天记录查询：按会话过滤 + 按时间排序
SELECT * FROM messages
WHERE conversation_id = 'xxx'
ORDER BY created_at DESC
LIMIT 50;
```

### @@unique() - 复合唯一约束

```prisma
model Friendship {
  userId   String
  friendId String

  @@unique([userId, friendId])  // userId + friendId 的组合必须唯一
}
```

意味着：

- ✅ (user1, user2) 可以存在
- ✅ (user1, user3) 可以存在
- ❌ (user1, user2) 再次插入会报错

### @@id() - 复合主键

```prisma
model PostTag {
  postId String
  tagId  String

  @@id([postId, tagId])  // 两个字段组合作为主键
}
```

---

## 关联关系

### @relation 的本质

`@relation` 就是告诉 Prisma 外键关系，让它生成正确的 JOIN 查询。

```prisma
model Message {
  senderId String              // 实际存储的外键字段
  sender   User @relation(...)  // 虚拟字段，不存数据库，用于 JOIN
}
```

**生成的表结构**：

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT REFERENCES users(id),  -- 外键约束
  content TEXT
);
```

### @relation 语法

```prisma
@relation(name?, fields: [...], references: [...], onDelete: ...)
```

| 参数         | 说明         | 对应 SQL                  |
| ------------ | ------------ | ------------------------- |
| `fields`     | 本表外键字段 | `FOREIGN KEY (sender_id)` |
| `references` | 关联表主键   | `REFERENCES users(id)`    |
| `onDelete`   | 删除行为     | `ON DELETE CASCADE`       |
| `name`       | 关系名称     | 无（仅 Prisma 用）        |

### 一对一 (1:1)

```prisma
model User {
  id       String        @id
  settings UserSettings?
}

model UserSettings {
  id     String @id
  userId String @unique  // @unique 使其成为一对一
  user   User   @relation(fields: [userId], references: [id])
}
```

```sql
-- user_id 有 UNIQUE 约束，保证一对一
CREATE TABLE user_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES users(id)
);
```

### 一对多 (1:N)

```prisma
model User {
  id       String    @id
  messages Message[]
}

model Message {
  id       String @id
  senderId String
  sender   User   @relation(fields: [senderId], references: [id])
}
```

```sql
-- sender_id 无 UNIQUE，一个用户可有多条消息
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT REFERENCES users(id)
);


-- 等价 JSON
  // const users =
  [
    {
      "id": "user_123",    // 👈 这是被引用的目标 (references: [id])
      "name": "Alice",
      "email": "alice@example.com"
    },
    {
      "id": "user_456",
      "name": "Bob",
      "email": "bob@example.com"
    }
  ]

  // const userSettings =
  [
    {
      "id": "setting_001",
      "theme": "dark",

      // 👇 这个字段就是 SQL 里的 user_id TEXT UNIQUE REFERENCES users(id)
      // 它存储的值，必须能在 users 数组里找到对应的 id
      "user_id": "user_123"
    },
    {
      "id": "setting_002",
      "theme": "light",

      // 👇 指向 Bob
      "user_id": "user_456"
    }
  ]


-- Prisma 查询
prisma.message.findMany({ include: { sender: true } })

-- 等价 SQL
SELECT m.*, u.* FROM messages m
LEFT JOIN users u ON m.sender_id = u.id;
```

### 同模型多关系（需要命名）

当一个模型有多个字段关联到同一个模型时，必须用名称区分：

```prisma
model User {
  id                     String          @id
  sentFriendRequests     FriendRequest[] @relation("SentRequests")
  receivedFriendRequests FriendRequest[] @relation("ReceivedRequests")
}

model FriendRequest {
  senderId   String
  receiverId String
  sender     User @relation("SentRequests", fields: [senderId], references: [id])
  receiver   User @relation("ReceivedRequests", fields: [receiverId], references: [id])
}
```

```sql
CREATE TABLE friend_requests (
  sender_id TEXT REFERENCES users(id),
  receiver_id TEXT REFERENCES users(id)
);

-- 两个外键都指向 users 表，Prisma 用名称区分
```

### 自关联

```prisma
model Message {
  id        String    @id
  replyToId String?
  replyTo   Message?  @relation("Replies", fields: [replyToId], references: [id])
  replies   Message[] @relation("Replies")
}
```

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  reply_to_id TEXT REFERENCES messages(id)  -- 自引用
);
```

### onDelete 行为

```prisma
onDelete: Cascade   // ON DELETE CASCADE  - 级联删除
onDelete: SetNull   // ON DELETE SET NULL - 设为 NULL
onDelete: Restrict  // ON DELETE RESTRICT - 阻止删除
```

```sql
-- Cascade: 删除用户时，自动删除其消息
ALTER TABLE messages
ADD CONSTRAINT fk_sender
FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;

-- SetNull: 删除用户时，消息的 sender_id 变成 NULL
ON DELETE SET NULL

-- Restrict: 如果用户有消息，禁止删除用户
ON DELETE RESTRICT
```

### 多对多 (M:N)

```prisma
model Conversation {
  id      String               @id
  members ConversationMember[]
}

model User {
  id      String               @id
  members ConversationMember[]
}

model ConversationMember {
  conversationId String
  userId         String
  role           MemberRole

  conversation Conversation @relation(fields: [conversationId], references: [id])
  user         User         @relation(fields: [userId], references: [id])

  @@unique([conversationId, userId])
}
```

```sql
-- 中间表实现多对多
CREATE TABLE conversation_members (
  conversation_id TEXT REFERENCES conversations(id),
  user_id TEXT REFERENCES users(id),
  role TEXT,
  UNIQUE(conversation_id, user_id)  -- 防止重复加入
);
```

---

## 实际应用示例

### 示例 1：查询用户及其消息

```typescript
// Prisma Client 查询
const userWithMessages = await prisma.user.findUnique({
  where: { id: 'user-id' },
  include: {
    sentMessages: true, // 包含用户发送的消息
  },
});

// 返回类型自动推断
// userWithMessages: User & { sentMessages: Message[] }
```

### 示例 2：创建关联数据

```typescript
// 创建用户同时创建设置
const user = await prisma.user.create({
  data: {
    username: 'jerry',
    email: 'jerry@example.com',
    nickname: 'Jerry',
    password: 'hashed-password',
    settings: {
      create: {
        // 嵌套创建
        language: 'zh-CN',
        theme: 'dark',
      },
    },
  },
  include: {
    settings: true,
  },
});
```

### 示例 3：查询消息及发送者

```typescript
const messages = await prisma.message.findMany({
  where: {
    conversationId: 'conversation-id',
  },
  include: {
    sender: {
      select: {
        id: true,
        nickname: true,
        avatar: true,
      },
    },
  },
  orderBy: {
    createdAt: 'desc',
  },
  take: 50, // 最多 50 条
});
```

---

## 常见问题

### Q: @unique 和 @@unique 的区别？

```prisma
// @unique - 单字段唯一
email String @unique

// @@unique - 多字段组合唯一
@@unique([userId, friendId])
```

### Q: 为什么有些字段有 @map 有些没有？

只有字段名需要转换时才用：

```prisma
createdAt DateTime @map("created_at")  // 需要转换
nickname  String                        // 不需要转换
```

### Q: cuid() 和 uuid() 怎么选？

| 类型     | 长度    | 特点                     |
| -------- | ------- | ------------------------ |
| `cuid()` | 25 字符 | 更短，有时间序，推荐使用 |
| `uuid()` | 36 字符 | 标准格式，兼容性好       |

### Q: 索引会影响性能吗？

- **查询性能**：提升
- **写入性能**：略微下降（需要维护索引）
- **存储空间**：增加

经验法则：**读多写少的字段适合加索引**

---

## 快速参考卡片

```prisma
// 字段属性 (@)
@id                    // 主键
@default(value)        // 默认值
@unique                // 唯一约束
@map("column_name")    // 列名映射
@updatedAt             // 自动更新时间
@relation(...)         // 定义关联

// 模型属性 (@@)
@@map("table_name")           // 表名映射
@@index([field])              // 单字段索引
@@index([field1, field2])     // 复合索引
@@unique([field1, field2])    // 复合唯一约束
@@id([field1, field2])        // 复合主键

// 字段修饰符
String?    // 可选（可为 null）
String[]   // 数组

// 常用默认值
@default(cuid())         // 紧凑唯一 ID
@default(uuid())         // 标准 UUID
@default(now())          // 当前时间
@default(autoincrement()) // 自增整数
@default(true)           // 布尔值
@default(ENUM_VALUE)     // 枚举值
```

---

## 延伸阅读

- [Prisma 官方文档](https://www.prisma.io/docs)
- [Prisma Schema 参考](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [关联关系详解](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)

---

_版本: 1.1.0 | 最后更新: 2024-12-04_

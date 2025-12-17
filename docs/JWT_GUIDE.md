# JWT 认证前端开发者指南

> 本文档帮助前端开发者理解 JWT 认证机制，以及在 Qyra 项目中的实现

---

## 目录

1. [什么是 JWT](#什么是-jwt)
2. [JWT 结构详解](#jwt-结构详解)
3. [认证流程](#认证流程)
4. [Nest.js 中的实现](#nestjs-中的实现)
5. [前端集成指南](#前端集成指南)
6. [安全最佳实践](#安全最佳实践)
7. [常见问题](#常见问题)

---

## 什么是 JWT

**JWT (JSON Web Token)** 是一种开放标准 (RFC 7519)，用于在各方之间安全地传输信息。

### 类比理解

| 概念     | 类比               |
| -------- | ------------------ |
| JWT      | 电子门禁卡         |
| 签名     | 门禁卡的防伪芯片   |
| Payload  | 卡上存储的员工信息 |
| 过期时间 | 门禁卡有效期       |

### 为什么用 JWT？

传统 Session 认证：

```
客户端 → 登录 → 服务端创建 Session → 返回 SessionID (Cookie)
客户端 → 请求 → 携带 Cookie → 服务端查询 Session → 返回数据
                              ↑
                         需要服务端存储
```

JWT 认证：

```
客户端 → 登录 → 服务端生成 JWT → 返回 Token
客户端 → 请求 → 携带 Token → 服务端验证签名 → 返回数据
                              ↑
                         无需服务端存储（无状态）
```

**JWT 优势**：

- ✅ 无状态：服务端不需要存储 Session
- ✅ 可扩展：多服务器部署无需同步 Session
- ✅ 跨域友好：可以放在 Header 中
- ✅ 移动端友好：不依赖 Cookie

---

## JWT 结构详解

一个 JWT 由三部分组成，用 `.` 分隔：

```
xxxxx.yyyyy.zzzzz
  ↓      ↓      ↓
Header.Payload.Signature
```

### 实际示例

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsInVzZXJuYW1lIjoiamVycnkiLCJlbWFpbCI6ImplcnJ5QGV4YW1wbGUuY29tIiwiaWF0IjoxNzAxNjgwMDAwLCJleHAiOjE3MDE2ODA5MDB9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### 1. Header（头部）

```json
{
  "alg": "HS256", // 签名算法
  "typ": "JWT" // Token 类型
}
```

Base64Url 编码后：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`

### 2. Payload（负载）

```json
{
  "sub": "user_123", // Subject - 用户 ID
  "username": "jerry", // 自定义数据
  "email": "jerry@example.com",
  "iat": 1701680000, // Issued At - 签发时间
  "exp": 1701680900 // Expiration - 过期时间
}
```

Base64Url 编码后：`eyJzdWIiOiJ1c2VyXzEyMyIs...`

**标准字段（Claims）**：

| 字段  | 全称       | 说明                  |
| ----- | ---------- | --------------------- |
| `sub` | Subject    | 主题（通常是用户 ID） |
| `iat` | Issued At  | 签发时间              |
| `exp` | Expiration | 过期时间              |
| `nbf` | Not Before | 生效时间              |
| `iss` | Issuer     | 签发者                |
| `aud` | Audience   | 接收者                |

### 3. Signature（签名）

```javascript
HMACSHA256(
  base64UrlEncode(header) + '.' + base64UrlEncode(payload),
  secret // 服务端密钥，绝不能泄露！
);
```

签名用于**验证消息完整性**和**确认发送者身份**。

### ⚠️ 重要提示

> Payload 是 **Base64 编码**，不是加密！任何人都可以解码查看内容。
>
> 所以 **不要在 JWT 中存放敏感信息**（如密码）。

```javascript
// 任何人都可以解码
const payload = JSON.parse(atob('eyJzdWIiOiJ1c2VyXzEyMyIs...'));
console.log(payload); // { sub: 'user_123', username: 'jerry', ... }
```

---

## 认证流程

### Qyra 的双 Token 机制

| Token            | 有效期  | 存储                  | 用途             |
| ---------------- | ------- | --------------------- | ---------------- |
| **AccessToken**  | 15 分钟 | 前端内存/localStorage | API 请求认证     |
| **RefreshToken** | 7 天    | 数据库 + 前端         | 刷新 AccessToken |

### 为什么用双 Token？

**单 Token 的问题**：

- 有效期短 → 用户频繁重新登录，体验差
- 有效期长 → Token 泄露后风险大

**双 Token 方案**：

- AccessToken 短期有效，减少泄露风险
- RefreshToken 长期有效，保持登录状态
- RefreshToken 存数据库，可随时吊销

### 完整流程图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   ┌──────────┐                                        ┌──────────────┐  │
│   │  前端    │                                        │    后端      │  │
│   └────┬─────┘                                        └──────┬───────┘  │
│        │                                                     │          │
│        │  1. POST /auth/login                                │          │
│        │  { account, password }                              │          │
│        │────────────────────────────────────────────────────>│          │
│        │                                                     │          │
│        │                              2. 验证密码            │          │
│        │                              3. 生成 Token 对       │          │
│        │                              4. 存储 RefreshToken   │          │
│        │                                                     │          │
│        │  { accessToken, refreshToken, user }                │          │
│        │<────────────────────────────────────────────────────│          │
│        │                                                     │          │
│   ┌────┴────┐                                                │          │
│   │ 存储    │                                                │          │
│   │ Token   │                                                │          │
│   └────┬────┘                                                │          │
│        │                                                     │          │
│        │  5. GET /users/me                                   │          │
│        │  Authorization: Bearer <accessToken>                │          │
│        │────────────────────────────────────────────────────>│          │
│        │                                                     │          │
│        │                              6. 验证 JWT 签名       │          │
│        │                              7. 检查是否过期        │          │
│        │                              8. 查询用户信息        │          │
│        │                                                     │          │
│        │  { user }                                           │          │
│        │<────────────────────────────────────────────────────│          │
│        │                                                     │          │
│   ════════════════════ AccessToken 过期 ═════════════════════│          │
│        │                                                     │          │
│        │  9. GET /users/me                                   │          │
│        │  Authorization: Bearer <expired-token>              │          │
│        │────────────────────────────────────────────────────>│          │
│        │                                                     │          │
│        │  401 Unauthorized                                   │          │
│        │<────────────────────────────────────────────────────│          │
│        │                                                     │          │
│        │  10. POST /auth/refresh                             │          │
│        │  { refreshToken }                                   │          │
│        │────────────────────────────────────────────────────>│          │
│        │                                                     │          │
│        │                              11. 验证 RefreshToken  │          │
│        │                              12. 删除旧 Token       │          │
│        │                              13. 生成新 Token 对    │          │
│        │                                                     │          │
│        │  { accessToken, refreshToken }                      │          │
│        │<────────────────────────────────────────────────────│          │
│        │                                                     │          │
│        │  14. 重试原请求（使用新 Token）                      │          │
│        │────────────────────────────────────────────────────>│          │
│        │                                                     │          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Nest.js 中的实现

### 核心文件

```
modules/auth/
├── auth.controller.ts      # 路由处理
├── auth.service.ts         # 业务逻辑
├── strategies/
│   └── jwt.strategy.ts     # JWT 解析策略
├── guards/
│   └── jwt-auth.guard.ts   # 认证守卫
└── decorators/
    ├── public.decorator.ts # @Public() 公开路由
    └── current-user.decorator.ts # @CurrentUser() 获取用户
```

### 1. JWT 策略 - 解析 Token

```typescript
// jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {
    super({
      // 从请求头提取 Token: Authorization: Bearer xxxxx
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 不忽略过期时间
      ignoreExpiration: false,
      // 签名密钥
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  // Token 验证通过后调用
  // payload = { sub: 'user_123', username: 'jerry', ... }
  async validate(payload: JwtPayload) {
    // 从数据库查询用户
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 返回值会被注入到 request.user
    return user;
  }
}
```

### 2. 认证守卫 - 拦截请求

```typescript
// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 检查是否有 @Public() 装饰器
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), // 方法级别
      context.getClass(), // 类级别
    ]);

    // 公开路由直接放行
    if (isPublic) {
      return true;
    }

    // 否则走 JWT 验证
    return super.canActivate(context);
  }
}
```

### 3. 全局注册守卫

```typescript
// app.module.ts
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // 所有路由默认需要认证
    },
  ],
})
export class AppModule {}
```

### 4. 公开路由装饰器

```typescript
// public.decorator.ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// 使用
@Public()  // 跳过认证
@Post('login')
async login() { ... }
```

### 5. 获取当前用户装饰器

```typescript
// current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;  // JwtStrategy.validate() 的返回值
    return data ? user?.[data] : user;
  },
);

// 使用
@Get('me')
async getMe(@CurrentUser() user) {  // 获取完整用户对象
  return user;
}

@Post('logout')
async logout(@CurrentUser('id') userId: string) {  // 只获取 ID
  // ...
}
```

### 6. Token 生成

```typescript
// auth.service.ts
async generateTokens(userId: string, username: string, email: string) {
  const payload: JwtPayload = { sub: userId, username, email };

  // 生成 AccessToken (15分钟)
  const accessToken = this.jwtService.sign(payload, {
    expiresIn: this.configService.get('jwt.accessExpiresIn'),  // '15m'
  });

  // 生成 RefreshToken (7天)
  const refreshToken = this.jwtService.sign(payload, {
    expiresIn: this.configService.get('jwt.refreshExpiresIn'),  // '7d'
  });

  // 存储 RefreshToken 到数据库
  await this.prisma.refreshToken.create({
    data: {
      userId,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken };
}
```

---

## 前端集成指南

### 1. 登录并存储 Token

```typescript
interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

async function login(account: string, password: string): Promise<AuthResponse> {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account, password }),
  });

  if (!response.ok) {
    throw new Error('登录失败');
  }

  const data: AuthResponse = await response.json();

  // 存储 Token
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);

  return data;
}
```

### 2. 请求拦截器 - 自动携带 Token

```typescript
// 使用 axios
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
});

// 请求拦截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 3. 响应拦截器 - 自动刷新 Token

```typescript
// 是否正在刷新
let isRefreshing = false;
// 等待刷新的请求队列
let refreshSubscribers: ((token: string) => void)[] = [];

// 添加到队列
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

// 刷新完成，执行队列
function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 且不是刷新接口本身
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 正在刷新，等待新 Token
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { accessToken, refreshToken: newRefreshToken } = await refreshTokens(refreshToken);

        // 更新存储
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // 通知等待的请求
        onTokenRefreshed(accessToken);

        // 重试原请求
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // 刷新失败，跳转登录
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

async function refreshTokens(refreshToken: string | null) {
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error('刷新失败');
  }

  return response.json();
}
```

### 4. 退出登录

```typescript
async function logout() {
  const refreshToken = localStorage.getItem('refreshToken');

  try {
    await api.post('/auth/logout', { refreshToken });
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }
}
```

### 5. 检查登录状态

```typescript
function isAuthenticated(): boolean {
  const token = localStorage.getItem('accessToken');
  if (!token) return false;

  try {
    // 解析 Payload
    const payload = JSON.parse(atob(token.split('.')[1]));
    // 检查是否过期
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
```

### 6. React Hook 封装

```typescript
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (account: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (account, password) => {
    const { user } = await login(account, password);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    await logout();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    if (!isAuthenticated()) {
      set({ user: null, isAuthenticated: false });
      return;
    }

    try {
      const user = await api.get('/users/me').then((r) => r.data);
      set({ user, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },
}));
```

---

## 安全最佳实践

### 1. Token 存储

| 存储方式        | XSS 风险 | CSRF 风险 | 推荐             |
| --------------- | -------- | --------- | ---------------- |
| localStorage    | ⚠️ 高    | ✅ 无     | 简单应用         |
| httpOnly Cookie | ✅ 无    | ⚠️ 需防护 | 高安全要求       |
| 内存            | ✅ 无    | ✅ 无     | 最安全但刷新丢失 |

**推荐方案**：

- AccessToken: 内存或 localStorage
- RefreshToken: httpOnly Cookie（配合 CSRF Token）

### 2. 防止 Token 泄露

```typescript
// ❌ 不要在 URL 中传递 Token
fetch(`/api/users?token=${accessToken}`);

// ✅ 在 Header 中传递
fetch('/api/users', {
  headers: { Authorization: `Bearer ${accessToken}` },
});
```

### 3. 安全的 JWT 配置

```typescript
// 后端配置
{
  // 使用强密钥（至少 256 位）
  secret: process.env.JWT_SECRET,  // 不要硬编码！

  // 短有效期
  accessExpiresIn: '15m',

  // 刷新 Token 可吊销
  refreshExpiresIn: '7d',
}
```

### 4. 敏感操作二次验证

```typescript
// 修改密码、删除账户等敏感操作
// 即使有 Token 也需要再次输入密码
@Post('change-password')
async changePassword(
  @CurrentUser('id') userId: string,
  @Body() dto: ChangePasswordDto,  // 包含当前密码
) {
  // 验证当前密码
  // ...
}
```

---

## 常见问题

### Q: Token 被盗怎么办？

**AccessToken 被盗**：

- 影响时间短（15分钟内）
- 下次刷新后失效

**RefreshToken 被盗**：

- 用户登出 → 删除数据库中的 Token
- 发现异常 → 清除用户所有 Token

```typescript
// 强制登出所有设备
await prisma.refreshToken.deleteMany({
  where: { userId: user.id },
});
```

### Q: 为什么不直接用 Session？

| 对比项     | Session      | JWT          |
| ---------- | ------------ | ------------ |
| 服务端存储 | 需要         | 不需要       |
| 水平扩展   | 需要共享存储 | 天然支持     |
| 移动端支持 | 依赖 Cookie  | 直接使用     |
| 吊销能力   | 天然支持     | 需要额外机制 |

JWT 更适合**分布式系统**和**移动端应用**。

### Q: AccessToken 过期后，请求会失败吗？

会返回 401，但前端拦截器会自动：

1. 用 RefreshToken 获取新 Token
2. 重试原请求
3. 用户无感知

### Q: RefreshToken 也过期了怎么办？

跳转到登录页，用户需要重新登录。

### Q: 如何实现"记住我"功能？

```typescript
// 登录时
if (rememberMe) {
  // RefreshToken 有效期延长到 30 天
  refreshExpiresIn = '30d';
} else {
  // 默认 7 天
  refreshExpiresIn = '7d';
}
```

### Q: 多设备登录如何处理？

每个设备生成独立的 RefreshToken，存储时记录 deviceId：

```typescript
await prisma.refreshToken.create({
  data: {
    userId,
    token: refreshToken,
    deviceId: dto.deviceId,  // 设备标识
    expiresAt: new Date(...),
  },
});
```

退出单个设备：删除对应的 RefreshToken
退出所有设备：删除用户所有 RefreshToken

---

## 快速参考

### API 端点

| 方法 | 路径                    | 描述       | 认证 |
| ---- | ----------------------- | ---------- | ---- |
| POST | `/api/v1/auth/register` | 注册       | ❌   |
| POST | `/api/v1/auth/login`    | 登录       | ❌   |
| POST | `/api/v1/auth/refresh`  | 刷新 Token | ❌   |
| POST | `/api/v1/auth/logout`   | 退出登录   | ✅   |

### 请求头格式

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Payload 结构

```typescript
interface JwtPayload {
  sub: string; // 用户 ID
  username: string; // 用户名
  email: string; // 邮箱
  iat: number; // 签发时间（秒）
  exp: number; // 过期时间（秒）
}
```

---

## 延伸阅读

- [JWT 官方网站](https://jwt.io/)
- [RFC 7519 - JSON Web Token](https://tools.ietf.org/html/rfc7519)
- [Passport.js 文档](http://www.passportjs.org/)
- [NestJS 认证文档](https://docs.nestjs.com/security/authentication)

---

_版本: 1.0.0 | 最后更新: 2024-12-04_

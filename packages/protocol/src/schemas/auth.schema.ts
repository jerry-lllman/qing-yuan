/**
 * 认证相关 Zod Schema
 */

import { z } from 'zod';
import { Limits } from '@cyan/shared';

/** 登录请求 Schema */
export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** 注册请求 Schema */
export const registerSchema = z.object({
  username: z
    .string()
    .min(Limits.USERNAME_MIN_LENGTH, `用户名至少 ${Limits.USERNAME_MIN_LENGTH} 个字符`)
    .max(Limits.USERNAME_MAX_LENGTH, `用户名最多 ${Limits.USERNAME_MAX_LENGTH} 个字符`)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, '用户名只能包含字母、数字和下划线，且必须以字母开头'),
  email: z.string().email('邮箱格式不正确'),
  password: z
    .string()
    .min(Limits.PASSWORD_MIN_LENGTH, `密码至少 ${Limits.PASSWORD_MIN_LENGTH} 个字符`)
    .max(Limits.PASSWORD_MAX_LENGTH, `密码最多 ${Limits.PASSWORD_MAX_LENGTH} 个字符`)
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/[a-z]/, '密码必须包含小写字母')
    .regex(/\d/, '密码必须包含数字'),
  nickname: z.string().max(Limits.NICKNAME_MAX_LENGTH).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/** 刷新 Token Schema */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token 不能为空'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

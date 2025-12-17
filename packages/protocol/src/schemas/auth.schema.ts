/**
 * 认证相关 Zod Schema
 */

import { z } from 'zod';
import { Limits } from '@qyra/shared';

/** 登录请求 Schema */
export const loginSchema = z.object({
  account: z.string().min(1, '用户名/邮箱不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** 用户名 Schema（可复用） */
export const usernameSchema = z
  .string()
  .min(Limits.USERNAME_MIN_LENGTH, `用户名至少 ${Limits.USERNAME_MIN_LENGTH} 个字符`)
  .max(Limits.USERNAME_MAX_LENGTH, `用户名最多 ${Limits.USERNAME_MAX_LENGTH} 个字符`)
  .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, '用户名只能包含字母、数字和下划线，且必须以字母开头');

/** 邮箱 Schema（可复用） */
export const emailSchema = z.string().email('邮箱格式不正确');

/** 密码 Schema（可复用） */
export const passwordSchema = z
  .string()
  .min(Limits.PASSWORD_MIN_LENGTH, `密码至少 ${Limits.PASSWORD_MIN_LENGTH} 个字符`)
  .max(Limits.PASSWORD_MAX_LENGTH, `密码最多 ${Limits.PASSWORD_MAX_LENGTH} 个字符`)
  .regex(/^\S+$/, '密码不能包含空格');

/** 昵称 Schema（可复用） */
export const nicknameSchema = z
  .string()
  .min(1, '昵称不能为空')
  .max(Limits.NICKNAME_MAX_LENGTH, `昵称最多 ${Limits.NICKNAME_MAX_LENGTH} 个字符`);

/** 注册请求 Schema（发送给服务端） */
export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, '请确认密码'),
  nickname: nicknameSchema.optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/** 注册表单 Schema（前端表单验证，包含确认密码） */
export const registerFormSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, '请确认密码'),
    nickname: nicknameSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

export type RegisterFormInput = z.infer<typeof registerFormSchema>;

/** 刷新 Token Schema */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token 不能为空'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

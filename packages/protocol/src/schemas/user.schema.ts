/**
 * 用户相关 Zod Schema
 */

import { z } from 'zod';
import { Limits } from '@cyan/shared';

/** 用户状态 */
export const userStatusSchema = z.enum(['online', 'offline', 'away', 'busy', 'invisible']);

/** 更新用户资料 Schema */
export const updateProfileSchema = z.object({
  nickname: z.string().max(Limits.NICKNAME_MAX_LENGTH, '昵称过长').optional(),
  avatar: z.string().url('无效的头像 URL').optional(),
  bio: z.string().max(Limits.BIO_MAX_LENGTH, '个人简介过长').optional(),
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, '无效的手机号')
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** 更新用户设置 Schema */
export const updateSettingsSchema = z.object({
  language: z.string().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notificationEnabled: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  vibrationEnabled: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

/** 更新用户状态 Schema */
export const updateStatusSchema = z.object({
  status: userStatusSchema,
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

/** 搜索用户 Schema */
export const searchUserSchema = z.object({
  keyword: z.string().min(1, '搜索关键词不能为空').max(50, '搜索关键词过长'),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(Limits.PAGE_SIZE_MAX).optional(),
});

export type SearchUserInput = z.infer<typeof searchUserSchema>;

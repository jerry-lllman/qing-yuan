/**
 * 好友相关 Zod Schema
 */

import { z } from 'zod';
import { Limits } from '@qing-yuan/shared';

/** 发送好友请求 Schema */
export const sendFriendRequestSchema = z.object({
  toUserId: z.string().uuid('无效的用户 ID'),
  message: z
    .string()
    .max(
      Limits.FRIEND_REQUEST_MESSAGE_MAX_LENGTH,
      `验证消息最多 ${Limits.FRIEND_REQUEST_MESSAGE_MAX_LENGTH} 个字符`
    )
    .optional(),
});

export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;

/** 响应好友请求 Schema */
export const respondFriendRequestSchema = z.object({
  requestId: z.string().uuid('无效的请求 ID'),
});

export type RespondFriendRequestInput = z.infer<typeof respondFriendRequestSchema>;

/** 删除好友 Schema */
export const removeFriendSchema = z.object({
  friendId: z.string().uuid('无效的好友 ID'),
});

export type RemoveFriendInput = z.infer<typeof removeFriendSchema>;

/** 更新好友备注 Schema */
export const updateFriendRemarkSchema = z.object({
  friendId: z.string().uuid('无效的好友 ID'),
  remark: z.string().max(Limits.NICKNAME_MAX_LENGTH, '备注名过长'),
});

export type UpdateFriendRemarkInput = z.infer<typeof updateFriendRemarkSchema>;

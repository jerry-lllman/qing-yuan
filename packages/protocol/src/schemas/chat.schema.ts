/**
 * 会话相关 Zod Schema
 */

import { z } from 'zod';
import { Limits } from '@qing-yuan/shared';

/** 创建私聊 Schema */
export const createPrivateChatSchema = z.object({
  participantId: z.string().uuid('无效的用户 ID'),
});

export type CreatePrivateChatInput = z.infer<typeof createPrivateChatSchema>;

/** 创建群聊 Schema */
export const createGroupChatSchema = z.object({
  name: z
    .string()
    .min(1, '群名称不能为空')
    .max(Limits.GROUP_NAME_MAX_LENGTH, `群名称最多 ${Limits.GROUP_NAME_MAX_LENGTH} 个字符`),
  avatar: z.string().url('无效的头像 URL').optional(),
  memberIds: z
    .array(z.string().uuid('无效的用户 ID'))
    .min(1, '至少选择一个群成员')
    .max(Limits.GROUP_MEMBERS_MAX - 1, `群成员最多 ${Limits.GROUP_MEMBERS_MAX} 人`),
});

export type CreateGroupChatInput = z.infer<typeof createGroupChatSchema>;

/** 更新群聊 Schema */
export const updateGroupChatSchema = z.object({
  conversationId: z.string().uuid('无效的会话 ID'),
  name: z
    .string()
    .min(1, '群名称不能为空')
    .max(Limits.GROUP_NAME_MAX_LENGTH, `群名称最多 ${Limits.GROUP_NAME_MAX_LENGTH} 个字符`)
    .optional(),
  avatar: z.string().url('无效的头像 URL').optional(),
  announcement: z
    .string()
    .max(
      Limits.GROUP_ANNOUNCEMENT_MAX_LENGTH,
      `群公告最多 ${Limits.GROUP_ANNOUNCEMENT_MAX_LENGTH} 个字符`
    )
    .optional(),
});

export type UpdateGroupChatInput = z.infer<typeof updateGroupChatSchema>;

/** 邀请加入群聊 Schema */
export const inviteMembersSchema = z.object({
  conversationId: z.string().uuid('无效的会话 ID'),
  memberIds: z
    .array(z.string().uuid('无效的用户 ID'))
    .min(1, '至少选择一个成员')
    .max(Limits.GROUP_MEMBERS_MAX, `单次最多邀请 ${Limits.GROUP_MEMBERS_MAX} 人`),
});

export type InviteMembersInput = z.infer<typeof inviteMembersSchema>;

/** 移除群成员 Schema */
export const removeMemberSchema = z.object({
  conversationId: z.string().uuid('无效的会话 ID'),
  memberId: z.string().uuid('无效的用户 ID'),
});

export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;

/** 更新群成员角色 Schema */
export const updateMemberRoleSchema = z.object({
  conversationId: z.string().uuid('无效的会话 ID'),
  memberId: z.string().uuid('无效的用户 ID'),
  role: z.enum(['admin', 'member']),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

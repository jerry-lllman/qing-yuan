/**
 * 会话事件载荷类型
 */

import { type ConversationType } from '@qyra/shared';

/** 创建私聊载荷 */
export interface CreatePrivateChatPayload {
  participantId: string;
}

/** 创建群聊载荷 */
export interface CreateGroupChatPayload {
  name: string;
  avatar?: string;
  memberIds: string[];
}

/** 更新群聊载荷 */
export interface UpdateGroupChatPayload {
  conversationId: string;
  name?: string;
  avatar?: string;
  announcement?: string;
}

/** 加入群聊载荷 */
export interface JoinChatPayload {
  conversationId: string;
  inviteCode?: string;
}

/** 离开群聊载荷 */
export interface LeaveChatPayload {
  conversationId: string;
}

/** 置顶/取消置顶载荷 */
export interface PinChatPayload {
  conversationId: string;
}

/** 免打扰载荷 */
export interface MuteChatPayload {
  conversationId: string;
}

/** 会话创建通知载荷 */
export interface ChatCreatedPayload {
  id: string;
  type: ConversationType;
  name: string | null;
  avatar: string | null;
  createdAt: string;
}

/** 成员加入通知载荷 */
export interface MemberJoinedPayload {
  conversationId: string;
  userId: string;
  nickname: string;
  avatar: string | null;
  joinedAt: string;
}

/** 成员离开通知载荷 */
export interface MemberLeftPayload {
  conversationId: string;
  userId: string;
  leftAt: string;
}

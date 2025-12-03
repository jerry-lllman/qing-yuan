/**
 * 会话相关类型定义
 */

import { type UserBrief } from './user.js';
import { type Message } from './message.js';

/** 会话类型 */
export type ConversationType = 'private' | 'group';

/** 群组成员角色 */
export type GroupMemberRole = 'owner' | 'admin' | 'member';

/** 会话基础信息 */
export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null; // 群聊名称，私聊为 null
  avatar: string | null; // 群聊头像，私聊为 null
  lastMessage: Message | null;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** 私聊会话 */
export interface PrivateConversation extends Conversation {
  type: 'private';
  participant: UserBrief;
}

/** 群聊会话 */
export interface GroupConversation extends Conversation {
  type: 'group';
  name: string;
  avatar: string | null;
  memberCount: number;
  ownerId: string;
  announcement: string | null;
}

/** 群组成员 */
export interface GroupMember {
  userId: string;
  user: UserBrief;
  groupId: string;
  role: GroupMemberRole;
  nickname: string | null; // 群内昵称
  joinedAt: Date;
}

/** 创建群组请求 */
export interface CreateGroupRequest {
  name: string;
  avatar?: string;
  memberIds: string[];
}

/** 更新群组请求 */
export interface UpdateGroupRequest {
  name?: string;
  avatar?: string;
  announcement?: string;
}

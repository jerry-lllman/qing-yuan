import type { PrivateConversation, GroupConversation } from '@qyra/shared';
import { API_VERSION, http } from './http-client';

/** 会话类型联合 */
export type ChatConversation = PrivateConversation | GroupConversation;

/** 创建私聊请求 */
export interface CreatePrivateChatRequest {
  targetUserId: string;
}

/** 创建群聊请求 */
export interface CreateGroupChatRequest {
  name: string;
  memberIds: string[];
}

/** 更新会话请求 */
export interface UpdateConversationRequest {
  isPinned?: boolean;
  isMuted?: boolean;
}

/** Chat API 接口 */
export interface ChatApi {
  /** 获取会话列表 */
  getConversations: () => Promise<ChatConversation[]>;
  /** 获取单个会话 */
  getConversation: (conversationId: string) => Promise<ChatConversation>;
  /** 创建或获取私聊会话 */
  createPrivateChat: (targetUserId: string) => Promise<PrivateConversation>;
  /** 创建群聊 */
  createGroupChat: (data: CreateGroupChatRequest) => Promise<GroupConversation>;
  /** 更新会话设置 */
  updateConversation: (conversationId: string, data: UpdateConversationRequest) => Promise<void>;
  /** 删除会话 */
  deleteConversation: (conversationId: string) => Promise<void>;
  /** 标记已读 */
  markAsRead: (conversationId: string) => Promise<void>;
}

/**
 * 创建 Chat API 实例
 *
 * @param version - API 版本，默认 V1
 * @returns Chat API 实例
 */
export function createChatApi(version = API_VERSION.V1): ChatApi {
  return {
    async getConversations() {
      return http.get<ChatConversation[]>(`${version}/conversations`);
    },

    async getConversation(conversationId: string) {
      return http.get<ChatConversation>(`${version}/conversations/${conversationId}`);
    },

    async createPrivateChat(targetUserId: string) {
      return http.post<PrivateConversation>(`${version}/conversations/private`, {
        targetUserId,
      });
    },

    async createGroupChat(data: CreateGroupChatRequest) {
      return http.post<GroupConversation>(`${version}/conversations/group`, data);
    },

    async updateConversation(conversationId: string, data: UpdateConversationRequest) {
      return http.put<void>(`${version}/conversations/${conversationId}`, data);
    },

    async deleteConversation(conversationId: string) {
      return http.delete<void>(`${version}/conversations/${conversationId}`);
    },

    async markAsRead(conversationId: string) {
      return http.post<void>(`${version}/conversations/${conversationId}/read`);
    },
  };
}

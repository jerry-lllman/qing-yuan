import type { Message, SendMessageRequest } from '@qyra/shared';
import { API_VERSION, http } from './http-client';

/** 获取消息列表参数 */
export interface GetMessagesParams {
  /** 获取此消息之前的消息 */
  before?: string;
  /** 获取此消息之后的消息 */
  after?: string;
  /** 限制返回数量 */
  limit?: number;
}

/** 获取消息列表响应 */
export interface GetMessagesResponse {
  messages: Message[];
  hasMore: boolean;
}

/** Message API 接口 */
export interface MessageApi {
  /** 发送消息（REST API 备用，主要通过 WebSocket） */
  sendMessage: (data: SendMessageRequest) => Promise<Message>;
  /** 获取会话消息历史 */
  getMessages: (conversationId: string, params?: GetMessagesParams) => Promise<GetMessagesResponse>;
  /** 编辑消息 */
  editMessage: (messageId: string, content: string) => Promise<Message>;
  /** 删除消息 */
  deleteMessage: (messageId: string) => Promise<void>;
  /** 撤回消息（同删除） */
  recallMessage: (messageId: string) => Promise<void>;
  /** 标记消息已读 */
  markAsRead: (conversationId: string, messageId: string) => Promise<void>;
}

/**
 * 创建 Message API 实例
 *
 * @param version - API 版本，默认 V1
 * @returns Message API 实例
 */
export function createMessageApi(version = API_VERSION.V1): MessageApi {
  return {
    async sendMessage(data: SendMessageRequest) {
      return http.post<Message>(`${version}/messages`, data);
    },

    async getMessages(conversationId: string, params?: GetMessagesParams) {
      const searchParams = new URLSearchParams();
      if (params?.before) searchParams.set('before', params.before);
      if (params?.after) searchParams.set('after', params.after);
      if (params?.limit) searchParams.set('limit', String(params.limit));

      const query = searchParams.toString();
      const url = `${version}/messages/conversation/${conversationId}${query ? `?${query}` : ''}`;

      return http.get<GetMessagesResponse>(url);
    },

    async editMessage(messageId: string, content: string) {
      return http.put<Message>(`${version}/messages/${messageId}`, { content });
    },

    async deleteMessage(messageId: string) {
      return http.delete<void>(`${version}/messages/${messageId}`);
    },

    async recallMessage(messageId: string) {
      // 撤回消息使用同一个删除接口
      return http.delete<void>(`${version}/messages/${messageId}`);
    },

    async markAsRead(conversationId: string, messageId: string) {
      return http.post<void>(`${version}/messages/read`, {
        conversationId,
        messageId,
      });
    },
  };
}

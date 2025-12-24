/**
 * 会话 API
 * 桥接 client-core 的 ChatApi 到桌面端
 */

import { createChatApi, type ChatApi as CoreChatApi } from '@qyra/client-core';
import type { ChatApi } from '@qyra/client-state';

// 创建核心 ChatApi 实例
const coreChatApi: CoreChatApi = createChatApi();

/**
 * 会话 API 实例
 * 适配 client-state 的 ChatApi 接口
 */
export const chatApi: ChatApi = {
  async getChats() {
    return coreChatApi.getConversations();
  },

  async getChat(chatId: string) {
    return coreChatApi.getConversation(chatId);
  },

  async createPrivateChat(userId: string) {
    return coreChatApi.createPrivateChat(userId);
  },

  async createGroupChat(data: { name: string; memberIds: string[] }) {
    return coreChatApi.createGroupChat(data);
  },

  async deleteChat(chatId: string) {
    return coreChatApi.deleteConversation(chatId);
  },

  async pinChat(chatId: string, isPinned: boolean) {
    return coreChatApi.updateConversation(chatId, { isPinned });
  },

  async muteChat(chatId: string, isMuted: boolean) {
    return coreChatApi.updateConversation(chatId, { isMuted });
  },

  async markAsRead(chatId: string) {
    return coreChatApi.markAsRead(chatId);
  },
};

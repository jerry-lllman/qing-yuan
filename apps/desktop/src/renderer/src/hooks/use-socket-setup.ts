/**
 * Socket 初始化 Hook
 * 负责建立 WebSocket 连接和监听实时事件
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  initSocketClient,
  socket,
  ConnectionStatus,
  createChatApi,
  type SocketClientConfig,
} from '@qyra/client-core';
import { MessageEvent, ChatEvent } from '@qyra/protocol';
import { useAuthStore, useChatStore, useMessageStore } from '@qyra/client-state';
import type { Message, PrivateConversation, GroupConversation } from '@qyra/shared';

// Socket 服务器 URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

// Chat API 用于获取会话详情
const chatApi = createChatApi();

/**
 * Socket 初始化 Hook
 * 在用户登录后建立 WebSocket 连接，监听实时消息和会话事件
 */
export function useSocketSetup(): void {
  const isInitialized = useRef(false);
  // 使用 state 来跟踪连接状态，以便触发 effect 重新运行
  const [isConnected, setIsConnected] = useState(false);

  // Auth Store
  const tokens = useAuthStore((state) => state.tokens);
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');

  // Chat Store Actions
  const addChat = useChatStore((state) => state.addChat);
  const updateChat = useChatStore((state) => state.updateChat);
  const updateLastMessage = useChatStore((state) => state.updateLastMessage);
  const incrementUnread = useChatStore((state) => state.incrementUnread);
  const removeChat = useChatStore((state) => state.removeChat);

  // Message Store Actions
  const addMessage = useMessageStore((state) => state.addMessage);
  const updateMessage = useMessageStore((state) => state.updateMessage);
  const deleteMessage = useMessageStore((state) => state.deleteMessage);

  // 获取当前会话 ID
  const getCurrentChatId = useCallback(() => {
    return useChatStore.getState().currentChatId;
  }, []);

  // 检查会话是否存在
  const hasChatLocally = useCallback((conversationId: string) => {
    return useChatStore.getState().chats.has(conversationId);
  }, []);

  // 获取并添加会话（用于接收到新会话的消息时）
  const fetchAndAddChat = useCallback(
    async (conversationId: string) => {
      try {
        const conversation = await chatApi.getConversation(conversationId);
        addChat(conversation);
        console.log('[Socket] Fetched and added chat:', conversationId);
      } catch (error) {
        console.error('[Socket] Failed to fetch chat:', conversationId, error);
      }
    },
    [addChat]
  );

  // Token 提供者
  const tokenProvider = useCallback(() => {
    return tokens?.accessToken ?? null;
  }, [tokens]);

  // 初始化 Socket 客户端并连接
  useEffect(() => {
    if (!isAuthenticated || !tokens?.accessToken) {
      return;
    }

    // 防止重复初始化
    if (isInitialized.current) {
      return;
    }

    const config: SocketClientConfig = {
      url: SOCKET_URL,
      namespace: '/chat',
      tokenProvider,
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 3000,
      timeout: 10000,
    };

    initSocketClient(config);
    isInitialized.current = true;

    // 监听连接状态变化
    const unsubscribeStatus = socket.onStatusChange((status, error) => {
      console.log('[Socket] Status changed:', status, error?.message);
      if (status === ConnectionStatus.AUTHENTICATED) {
        console.log('[Socket] Authenticated successfully');
        // 设置连接状态，触发事件监听器的 effect
        setIsConnected(true);
      } else if (status === ConnectionStatus.DISCONNECTED || status === ConnectionStatus.ERROR) {
        setIsConnected(false);
      }
    });

    // 连接到服务器
    socket.connect().catch((error) => {
      console.error('[Socket] Connection failed:', error);
    });

    return () => {
      unsubscribeStatus();
    };
  }, [isAuthenticated, tokens?.accessToken, tokenProvider]);

  // 设置事件监听器 - 只有在连接成功后才设置
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    console.log('[Socket] Setting up event listeners...');

    // ============================================================
    // 消息事件监听
    // ============================================================

    // 接收新消息
    // 注意：服务端发送的是完整的 Message 对象，但 Socket 类型定义为 MessageReceivedPayload
    // 这里使用类型断言来适配
    const unsubscribeReceive = socket.on(MessageEvent.RECEIVE, async (payload) => {
      // 服务端实际发送的是完整的 Message 对象
      const message = payload as unknown as Message;
      console.log('[Socket] Message received:', message);

      const { conversationId } = message;

      // 如果本地没有这个会话，先获取会话详情
      if (!hasChatLocally(conversationId)) {
        await fetchAndAddChat(conversationId);
      }

      // 添加到消息 store
      addMessage(conversationId, message);

      // 更新会话的最后一条消息
      updateLastMessage(conversationId, message);

      // 如果不是当前会话，增加未读计数
      const currentChatId = getCurrentChatId();
      if (currentChatId !== conversationId) {
        incrementUnread(conversationId);
      }
    });

    // 消息送达
    const unsubscribeDelivered = socket.on(MessageEvent.DELIVERED, (payload) => {
      console.log('[Socket] Message delivered:', payload);
      // 可以更新消息状态为已送达
    });

    // 消息更新（编辑）
    // 服务端发送完整 Message 对象
    const unsubscribeUpdated = socket.on(MessageEvent.UPDATED, (payload) => {
      const message = payload as unknown as Message;
      console.log('[Socket] Message updated:', message);
      updateMessage(message.conversationId, message.id, message);
    });

    // 消息删除
    const unsubscribeDeleted = socket.on(
      MessageEvent.DELETED,
      (payload: { messageId: string; conversationId?: string }) => {
        console.log('[Socket] Message deleted:', payload);
        // 需要知道 conversationId 才能删除，这里可能需要后端配合
        // 暂时遍历所有会话
        if (payload.conversationId) {
          deleteMessage(payload.conversationId, payload.messageId);
        }
      }
    );

    // ============================================================
    // 会话事件监听
    // ============================================================

    // 新会话创建
    // 服务端发送的是完整的会话对象
    const unsubscribeChatCreated = socket.on(ChatEvent.CREATED, (payload) => {
      const chat = payload as PrivateConversation | GroupConversation;
      console.log('[Socket] Chat created:', chat);
      addChat(chat);
    });

    // 会话更新
    const unsubscribeChatUpdated = socket.on(ChatEvent.UPDATED, (payload) => {
      const chat = payload as Partial<PrivateConversation | GroupConversation> & { id: string };
      console.log('[Socket] Chat updated:', chat);
      updateChat(chat.id, chat);
    });

    // 会话删除
    const unsubscribeChatDeleted = socket.on(ChatEvent.DELETED, (payload: { chatId: string }) => {
      console.log('[Socket] Chat deleted:', payload);
      removeChat(payload.chatId);
    });

    // 清理函数
    return () => {
      console.log('[Socket] Cleaning up event listeners...');
      unsubscribeReceive();
      unsubscribeDelivered();
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribeChatCreated();
      unsubscribeChatUpdated();
      unsubscribeChatDeleted();
    };
  }, [
    isConnected,
    addMessage,
    updateMessage,
    deleteMessage,
    addChat,
    updateChat,
    updateLastMessage,
    incrementUnread,
    removeChat,
    getCurrentChatId,
    hasChatLocally,
    fetchAndAddChat,
  ]);

  // 断开连接（登出时）
  useEffect(() => {
    if (!isAuthenticated && isInitialized.current) {
      socket.disconnect();
      isInitialized.current = false;
      setIsConnected(false);
    }
  }, [isAuthenticated]);
}

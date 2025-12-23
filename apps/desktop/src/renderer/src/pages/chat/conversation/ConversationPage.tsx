/**
 * ConversationPage 会话页面
 * 显示聊天消息列表和输入框
 */

import { useEffect, useMemo, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore, useChatStore, useMessage, type MessageApi } from '@qyra/client-state';
import { createMessageApi } from '@qyra/client-core';
import type { MessageType, PrivateConversation, GroupConversation } from '@qyra/shared';
import { ChatHeader, MessageList, MessageInput } from '@renderer/components/chat';

// 创建 Message API 实例
const messageApi: MessageApi = createMessageApi();

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  // 输入状态（如 "正在输入..."）
  const [typingUsers, _setTypingUsers] = useState<string[]>([]);

  // 获取当前用户
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?.id || '';

  // 获取会话信息
  const chat = useChatStore((state) =>
    conversationId ? state.chats.get(conversationId) : undefined
  );
  const setCurrentChat = useChatStore((state) => state.setCurrentChat);

  // 使用 useMessage hook
  // 注意：hook 返回的 messages 已包含 pending 消息，无需额外处理
  const {
    messages,
    draft,
    sendMessage,
    retrySendMessage,
    fetchMoreMessages,
    setDraft,
    isLoading,
    isLoadingMore,
    hasMore,
    isSending,
  } = useMessage({
    api: messageApi,
    conversationId: conversationId || '',
    currentUserId, // 传递当前用户 ID，用于标记 pending 消息
    pageSize: 30,
    onSendError: (error, pendingMessage) => {
      console.error('[Chat] Send failed:', error, pendingMessage);
    },
  });

  // 设置当前会话
  useEffect(() => {
    if (conversationId) {
      setCurrentChat(conversationId);
    }
    return () => {
      setCurrentChat(null);
    };
  }, [conversationId, setCurrentChat]);

  // 获取会话显示信息
  const chatInfo = useMemo(() => {
    if (!chat) {
      return {
        name: '加载中...',
        avatar: null,
        isGroup: false,
        status: undefined,
        memberCount: undefined,
      };
    }

    if (chat.type === 'private') {
      const privateChat = chat as PrivateConversation;
      return {
        name: privateChat.participant.nickname || privateChat.participant.username,
        avatar: privateChat.participant.avatar,
        isGroup: false,
        status: privateChat.participant.status,
        memberCount: undefined,
      };
    }

    const groupChat = chat as GroupConversation;
    return {
      name: groupChat.name,
      avatar: groupChat.avatar,
      isGroup: true,
      status: undefined,
      memberCount: groupChat.memberCount,
    };
  }, [chat]);

  // 构建输入状态文本
  const typingText = useMemo(() => {
    if (typingUsers.length === 0) return undefined;
    if (typingUsers.length === 1) return `${typingUsers[0]} 正在输入...`;
    if (typingUsers.length === 2) return `${typingUsers.join(' 和 ')} 正在输入...`;
    return `${typingUsers.length} 人正在输入...`;
  }, [typingUsers]);

  // 处理发送消息
  const handleSend = useCallback(
    async (data: { type: MessageType; content: string }) => {
      if (!conversationId) return;
      await sendMessage(data);
    },
    [conversationId, sendMessage]
  );

  // 处理草稿变化
  const handleDraftChange = useCallback(
    (content: string) => {
      setDraft(content);
    },
    [setDraft]
  );

  // 处理重试发送
  const handleRetry = useCallback(
    (messageId: string) => {
      retrySendMessage(messageId);
    },
    [retrySendMessage]
  );

  // 处理加载更多
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      fetchMoreMessages();
    }
  }, [hasMore, isLoadingMore, fetchMoreMessages]);

  // 处理返回
  const handleBack = useCallback(() => {
    navigate('/chat');
  }, [navigate]);

  // 无会话 ID 时显示空状态
  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background rounded-r-md">
        <p className="text-muted-foreground">选择一个会话开始聊天</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background rounded-r-md overflow-hidden">
      {/* 聊天头部 */}
      <ChatHeader
        name={chatInfo.name}
        avatar={chatInfo.avatar}
        isGroup={chatInfo.isGroup}
        status={chatInfo.status}
        memberCount={chatInfo.memberCount}
        subtitle={typingText}
        onBack={handleBack}
        showBack={false}
      />

      {/* 消息列表 */}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        isGroup={chatInfo.isGroup}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        onRetry={handleRetry}
        className="flex-1"
      />

      {/* 输入区域 */}
      <MessageInput
        defaultValue={draft?.content || ''}
        onSend={handleSend}
        onChange={handleDraftChange}
        isSending={isSending}
        placeholder="输入消息..."
      />
    </div>
  );
}

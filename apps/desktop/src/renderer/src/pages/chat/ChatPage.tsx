/**
 * 聊天页面
 * 显示当前选中会话的消息
 */

import { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useChat } from '@qyra/client-state';
import { ChatList } from './components/ChatList';
import { chatApi } from '@renderer/api/chat';
import logo from '@qyra/assets/images/logo.png';

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();

  // 获取会话列表
  const { fetchChats, chatsError } = useChat({
    api: chatApi,
    onError: (error) => {
      console.error('[ChatPage] Failed to fetch chats:', error);
    },
  });

  // 组件挂载时获取会话列表
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // 显示错误信息
  useEffect(() => {
    if (chatsError) {
      console.error('[ChatPage] Chats error:', chatsError);
    }
  }, [chatsError]);

  return (
    <div className="flex flex-1 gap-0.5 min-h-0">
      {/* 会话列表 */}
      <ChatList />
      <Outlet />
      {!conversationId && (
        <div className="flex-1 flex flex-col items-center justify-center bg-background rounded-r-md">
          <img src={logo} alt="Qyra Logo" className="w-38 h-38" />
        </div>
      )}
    </div>
  );
}

/**
 * 聊天页面
 * 显示当前选中会话的消息
 */

import { Outlet, useParams } from 'react-router-dom';
import { ChatList } from './components/ChatList';
import logo from '@qyra/assets/images/logo.png';

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();

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

/**
 * 聊天页面
 * 显示当前选中会话的消息
 */

import { useParams } from 'react-router-dom';

import logo from '@qyra/assets/images/logo.png';

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();

  if (!conversationId) {
    // 未选择会话时显示欢迎页面
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <img src={logo} alt="Qyra Logo" className="w-68 h-68" />
      </div>
    );
  }

  // TODO: 实现聊天界面
  return (
    <div className="flex-1 flex flex-col">
      {/* 聊天头部 */}
      <header className="h-14 border-b flex items-center px-4">
        <h3 className="font-medium">会话 {conversationId}</h3>
      </header>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-muted-foreground text-center">消息列表开发中...</p>
      </div>

      {/* 输入区域 */}
      <footer className="h-32 border-t p-4">
        <p className="text-muted-foreground text-center text-sm">输入区域开发中...</p>
      </footer>
    </div>
  );
}

/**
 * 聊天页面
 * 显示当前选中会话的消息
 */

import { useParams } from 'react-router-dom';

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();

  if (!conversationId) {
    // 未选择会话时显示欢迎页面
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <div className="text-6xl mb-4">💬</div>
        <h2 className="text-xl font-medium mb-2">欢迎使用 Qing Yuan</h2>
        <p className="text-sm">选择一个会话开始聊天</p>
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

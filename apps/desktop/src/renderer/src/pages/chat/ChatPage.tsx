/**
 * 聊天页面
 * 显示当前选中会话的消息
 */

import { useParams } from 'react-router-dom';
import { ChatList } from './components/ChatList';

import logo from '@qyra/assets/images/logo.png';

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();

  // if (!conversationId) {
  //   // 未选择会话时显示欢迎页面
  //   return (
  //     <div className="flex flex-1 gap-0.5 min-h-0">
  //       <ChatList />
  //       <div className="flex-1 flex flex-col items-center justify-center bg-background rounded-r-md">
  //         <img src={logo} alt="Qyra Logo" className="w-38 h-38" />
  //       </div>
  //     </div>
  //   );
  // }

  // TODO: 实现聊天界面
  return (
    <div className="flex flex-1 gap-0.5 min-h-0">
      {/* 会话列表 */}
      <ChatList />
      {conversationId ? (
        <div className="flex-1 flex flex-col gap-0.5 rounded-r-md">
          {/* 聊天头部 */}
          <header className="h-14 border-b flex items-center px-4 bg-background">
            <h3 className="font-medium">会话 {conversationId}</h3>
          </header>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 bg-background">
            <p className="text-muted-foreground text-center">消息列表开发中...</p>
          </div>

          {/* 输入区域 */}
          <footer className="h-32 border-t p-4 bg-background">
            <p className="text-muted-foreground text-center text-sm">输入区域开发中...</p>
          </footer>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-background rounded-r-md">
          <img src={logo} alt="Qyra Logo" className="w-38 h-38" />
        </div>
      )}
    </div>
  );
}

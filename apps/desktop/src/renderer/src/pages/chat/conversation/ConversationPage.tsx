import { useParams } from 'react-router-dom';

export default function ConvertastionPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();

  return (
    <div className="flex-1 flex flex-col gap-0.5 rounded-r-md">
      {/* 聊天头部 */}
      <header className="h-14   flex items-center px-4 bg-background">
        <h3 className="font-medium">会话 {conversationId}</h3>
      </header>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 bg-background">
        <p className="text-muted-foreground text-center">消息列表开发中...</p>
      </div>

      {/* 输入区域 */}
      <footer className="h-32   p-4 bg-background">
        <p className="text-muted-foreground text-center text-sm">输入区域开发中...</p>
      </footer>
    </div>
  );
}

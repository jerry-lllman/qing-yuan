/**
 * 会话列表组件
 */

import { useNavigate, useParams } from 'react-router-dom';
import { useChatStore } from '@qyra/client-state';
import { Avatar, AvatarFallback, AvatarImage, Input } from '@qyra/ui-web';
import { cn } from '@qyra/ui-web';

// 搜索图标
const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-muted-foreground"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export function ChatList() {
  const navigate = useNavigate();
  const { conversationId: currentId } = useParams<{ conversationId?: string }>();

  // 从 store 获取会话列表
  const chatIds = useChatStore((state) => state.chatIds);
  const chats = useChatStore((state) => state.chats);

  // 转换为数组
  const chatList = chatIds.map((id) => chats.get(id)).filter(Boolean);

  return (
    <aside className="w-72  flex flex-col bg-background">
      {/* 搜索框 */}
      <div className="p-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <SearchIcon />
          </span>
          <Input placeholder="搜索" className="pl-9 h-9 indent-5 placeholder:indent-5" />
        </div>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto">
        {chatList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">暂无会话</p>
            <p className="text-xs mt-1">开始一段新的对话吧</p>
          </div>
        ) : (
          <ul className="space-y-0.5 px-2">
            {chatList.map((chat) => (
              <li key={chat!.id}>
                <button
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg text-left',
                    'hover:bg-accent transition-colors',
                    currentId === chat!.id && 'bg-accent'
                  )}
                  onClick={() => navigate(`/chat/${chat!.id}`)}
                >
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={undefined} />
                    <AvatarFallback>{chat!.type === 'private' ? '👤' : '👥'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">
                        {chat!.type === 'private' ? '私聊' : '群聊'}
                      </span>
                      {chat!.unreadCount > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                          {chat!.unreadCount > 99 ? '99+' : chat!.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {chat!.lastMessage?.content || '暂无消息'}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

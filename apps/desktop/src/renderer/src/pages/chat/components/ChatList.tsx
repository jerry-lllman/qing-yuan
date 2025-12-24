/**
 * 会话列表组件
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useChatStore } from '@qyra/client-state';
import { Avatar, AvatarFallback, AvatarImage, Button, Input } from '@qyra/ui-web';
import { cn } from '@qyra/ui-web';
import { Plus, Search } from 'lucide-react';
import { SearchUserDialog } from './SearchUserDialog';
import type { PrivateConversation, GroupConversation } from '@qyra/shared';

/**
 * 获取会话显示名称
 */
function getChatDisplayName(chat: PrivateConversation | GroupConversation): string {
  if (chat.type === 'private') {
    const privateChat = chat as PrivateConversation;
    return privateChat.participant?.nickname || privateChat.participant?.username || '未知用户';
  }
  // 群聊
  const groupChat = chat as GroupConversation;
  return groupChat.name || '未命名群聊';
}

/**
 * 获取会话头像
 */
function getChatAvatar(chat: PrivateConversation | GroupConversation): string | null {
  if (chat.type === 'private') {
    const privateChat = chat as PrivateConversation;
    return privateChat.participant?.avatar || null;
  }
  // 群聊
  const groupChat = chat as GroupConversation;
  return groupChat.avatar || null;
}

/**
 * 获取头像 fallback 文字
 */
function getAvatarFallback(chat: PrivateConversation | GroupConversation): string {
  const name = getChatDisplayName(chat);
  return name.charAt(0).toUpperCase();
}

export function ChatList() {
  const navigate = useNavigate();
  const { conversationId: currentId } = useParams<{ conversationId?: string }>();
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  // 从 store 获取会话列表
  const chatIds = useChatStore((state) => state.chatIds);
  const chats = useChatStore((state) => state.chats);

  // 转换为数组
  const chatList = chatIds.map((id) => chats.get(id)).filter(Boolean);

  // const chatList = [
  //   {
  //     type: 'private',
  //     participant: {
  //       id: 'string',
  //       username: 'string',
  //       nickname: 'string',
  //       avatar: null,
  //       status: 'online',
  //     },
  //   },
  // ];

  return (
    <aside className="w-72  flex flex-col bg-background">
      {/* 搜索框 */}
      <div className="p-3 flex items-center gap-1">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Search className="text-muted-foreground size-4" />
          </span>
          <Input placeholder="搜索" className="pl-9 h-9 indent-5 placeholder:indent-5" />
        </div>
        <Button variant="secondary" onClick={() => setSearchDialogOpen(true)}>
          <Plus className="text-gray-500" />
        </Button>
      </div>

      {/* 搜索用户弹窗 */}
      <SearchUserDialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen} />

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
                    <AvatarImage src={getChatAvatar(chat!) ?? undefined} />
                    <AvatarFallback>{getAvatarFallback(chat!)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{getChatDisplayName(chat!)}</span>
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

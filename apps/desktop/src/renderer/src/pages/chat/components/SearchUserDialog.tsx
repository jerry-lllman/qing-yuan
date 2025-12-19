/**
 * 搜索用户弹窗组件
 */

import { useCallback } from 'react';
import type { UserBrief } from '@qyra/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
} from '@qyra/ui-web';
import { Search, UserPlus, Loader2 } from 'lucide-react';
import { useSearch } from '@qyra/client-state';
import { usersApi } from '@renderer/api/users';

interface SearchUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser?: (user: UserBrief) => void;
}

export function SearchUserDialog({ open, onOpenChange, onSelectUser }: SearchUserDialogProps) {
  const { keyword, setKeyword, users, hasSearched, isSearching, search, reset, handleKeyDown } =
    useSearch({
      api: usersApi,
      onError: (error) => {
        console.error('搜索用户失败:', error);
      },
    });

  // 关闭弹窗时重置状态
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        reset();
      }
    },
    [onOpenChange, reset]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>搜索用户</DialogTitle>
        </DialogHeader>

        {/* 搜索输入框 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search className="text-muted-foreground size-4" />
            </span>
            <Input
              placeholder="搜索"
              className="pl-9 h-9 indent-5 placeholder:indent-5"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button onClick={search} disabled={!keyword.trim() || isSearching}>
            {isSearching ? <Loader2 className="size-4 animate-spin" /> : '搜索'}
          </Button>
        </div>

        {/* 搜索结果 */}
        <div className="max-h-75 overflow-y-auto -mx-2">
          {!hasSearched ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Search className="size-8 mb-2 opacity-50" />
              <p className="text-sm">输入关键词搜索用户</p>
            </div>
          ) : isSearching ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="size-8 mb-2 animate-spin" />
              <p className="text-sm">搜索中...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">未找到相关用户</p>
              <p className="text-xs mt-1">尝试其他关键词</p>
            </div>
          ) : (
            <ul className="space-y-1 px-2">
              {users.map((user) => (
                <li key={user.id}>
                  <div className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-accent transition-colors">
                    <Avatar className="size-10 shrink-0">
                      <AvatarImage src={user.avatar ?? undefined} />
                      <AvatarFallback>
                        {user.nickname?.charAt(0) || user.username?.charAt(0) || '👤'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.nickname || user.username}</p>
                      <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      // 发起添加好友请求
                      onClick={() => onSelectUser?.(user)}
                    >
                      <UserPlus className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

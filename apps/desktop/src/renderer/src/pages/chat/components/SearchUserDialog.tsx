/**
 * 搜索用户弹窗组件
 */

import { useState, useCallback } from 'react';
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
import { usersApi } from '@renderer/api/users';

interface SearchUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser?: (user: UserBrief) => void;
}

export function SearchUserDialog({ open, onOpenChange, onSelectUser }: SearchUserDialogProps) {
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<UserBrief[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // 搜索用户
  const handleSearch = useCallback(async () => {
    if (!keyword.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    // TODO: 对接真实接口
    const result = await usersApi.searchUsers({ keyword });
    setUsers(result);
    setIsLoading(false);
  }, [keyword]);

  // 按下回车键搜索
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  const handleSelectUser = useCallback(
    (user: UserBrief) => {
      onSelectUser?.(user);
      onOpenChange(false);
      setKeyword('');
      setUsers([]);
      setHasSearched(false);
    },
    [onSelectUser, onOpenChange]
  );

  // 关闭弹窗时重置状态
  const handleOpenChange = useCallback(
    (open: boolean) => {
      onOpenChange(open);
      if (!open) {
        setKeyword('');
        setUsers([]);
        setHasSearched(false);
      }
    },
    [onOpenChange]
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
          <Button onClick={handleSearch} disabled={!keyword.trim() || isLoading}>
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : '搜索'}
          </Button>
        </div>

        {/* 搜索结果 */}
        <div className="max-h-75 overflow-y-auto -mx-2">
          {!hasSearched ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Search className="size-8 mb-2 opacity-50" />
              <p className="text-sm">输入关键词搜索用户</p>
            </div>
          ) : isLoading ? (
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
                  <button
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-accent transition-colors"
                    onClick={() => handleSelectUser(user)}
                  >
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
                    <Button variant="ghost" size="sm" className="shrink-0">
                      <UserPlus className="size-4" />
                    </Button>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

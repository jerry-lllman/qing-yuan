/**
 * useSearch Hook
 * 搜索用户的组合 Hook，整合 TanStack Query
 *
 * 功能：
 * - 根据关键词搜索用户
 * - 管理搜索状态和结果
 * - 支持键盘快捷键（回车搜索）
 */

import type { UserBrief } from '@qyra/shared';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

// ========================
// 类型定义
// ========================

/** 搜索 API 接口（由使用方注入） */
export interface SearchApi {
  /** 搜索用户 */
  searchUsers: (params: { keyword: string; limit?: number }) => Promise<UserBrief[]>;
}

/** useSearch Hook 配置 */
export interface UseSearchOptions {
  /** 搜索 API 实现 */
  api: SearchApi;
  /** 搜索结果数量限制 */
  limit?: number;
  /** 错误回调 */
  onError?: (error: string) => void;
  /** 搜索成功回调 */
  onSuccess?: (users: UserBrief[]) => void;
}

/** useSearch Hook 返回值 */
export interface UseSearchReturn {
  // ========== 状态 ==========
  /** 搜索关键词 */
  keyword: string;
  /** 搜索结果 */
  users: UserBrief[];
  /** 是否已执行过搜索 */
  hasSearched: boolean;
  /** 是否正在搜索 */
  isSearching: boolean;
  /** 错误信息 */
  error: string | null;

  // ========== 操作 ==========
  /** 更新关键词 */
  setKeyword: (keyword: string) => void;
  /** 执行搜索 */
  search: () => Promise<void>;
  /** 重置状态 */
  reset: () => void;
  /** 清除错误 */
  clearError: () => void;
  /** 处理键盘事件（回车搜索） */
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

// ========================
// Hook 实现
// ========================

/**
 * 搜索用户 Hook
 *
 * @example
 * ```tsx
 * const { keyword, setKeyword, users, search, isSearching } = useSearch({
 *   api: usersApi,
 *   onSuccess: (users) => console.log('Found users:', users),
 * });
 *
 * // 搜索
 * setKeyword('张三');
 * await search();
 * ```
 */
export function useSearch(options: UseSearchOptions): UseSearchReturn {
  const { api, limit, onError, onSuccess } = options;

  // ========== 本地状态 ==========
  const [keyword, setKeyword] = useState('');
  const [users, setUsers] = useState<UserBrief[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ========== 错误处理 ==========
  const handleError = useCallback(
    (err: unknown) => {
      const errorMessage = (err as Error)?.message || '搜索失败，请稍后重试';
      setError(errorMessage);
      onError?.(errorMessage);
    },
    [onError]
  );

  // ========== 搜索 Mutation ==========
  const searchMutation = useMutation({
    mutationFn: async (params: { keyword: string; limit?: number }) => {
      setError(null);
      return api.searchUsers(params);
    },
    onSuccess: (result: UserBrief[]) => {
      setUsers(result);
      setHasSearched(true);
      onSuccess?.(result);
    },
    onError: handleError,
  });

  // ========== 暴露的方法 ==========
  const search = useCallback(async () => {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) return;

    await searchMutation.mutateAsync({ keyword: trimmedKeyword, limit });
  }, [keyword, limit, searchMutation]);

  const reset = useCallback(() => {
    setKeyword('');
    setUsers([]);
    setHasSearched(false);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        search();
      }
    },
    [search]
  );

  // ========== 返回值 ==========
  return useMemo(
    () => ({
      // 状态
      keyword,
      users,
      hasSearched,
      isSearching: searchMutation.isPending,
      error,

      // 操作
      setKeyword,
      search,
      reset,
      clearError,
      handleKeyDown,
    }),
    [
      keyword,
      users,
      hasSearched,
      searchMutation.isPending,
      error,
      search,
      reset,
      clearError,
      handleKeyDown,
    ]
  );
}

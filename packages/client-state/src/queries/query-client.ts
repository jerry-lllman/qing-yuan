/**
 * TanStack Query Client 配置
 * 提供全局 QueryClient 实例和配置
 */

import { QueryClient } from '@tanstack/react-query';

// ========================
// 默认配置
// ========================

/** 默认 stale time（数据被视为过期的时间） */
export const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 分钟

/** 默认 cache time（缓存保留时间） */
export const DEFAULT_GC_TIME = 30 * 60 * 1000; // 30 分钟

/** 默认重试次数 */
export const DEFAULT_RETRY_COUNT = 3;

// ========================
// QueryClient 工厂
// ========================

/**
 * 创建 QueryClient 实例
 *
 * @param options - 自定义配置选项
 * @returns QueryClient 实例
 *
 * @example
 * ```tsx
 * const queryClient = createQueryClient();
 *
 * <QueryClientProvider client={queryClient}>
 *   <App />
 * </QueryClientProvider>
 * ```
 */
export function createQueryClient(options?: {
  staleTime?: number;
  gcTime?: number;
  retry?: number | boolean;
}): QueryClient {
  const {
    staleTime = DEFAULT_STALE_TIME,
    gcTime = DEFAULT_GC_TIME,
    retry = DEFAULT_RETRY_COUNT,
  } = options ?? {};

  return new QueryClient({
    defaultOptions: {
      queries: {
        // 数据过期时间
        staleTime,
        // 垃圾回收时间（缓存保留时间）
        gcTime,
        // 重试配置
        retry: typeof retry === 'boolean' ? (retry ? DEFAULT_RETRY_COUNT : 0) : retry,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // 窗口聚焦时不自动重新获取（用户体验优化）
        refetchOnWindowFocus: false,
        // 网络重连时不自动重新获取
        refetchOnReconnect: false,
        // 组件挂载时不自动重新获取
        refetchOnMount: false,
      },
      mutations: {
        // mutation 重试配置
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
}

// ========================
// 全局 QueryClient 单例
// ========================

let globalQueryClient: QueryClient | null = null;

/**
 * 获取全局 QueryClient 实例（单例模式）
 *
 * @returns QueryClient 实例
 *
 * @example
 * ```tsx
 * // 在非 React 环境中使用
 * const queryClient = getQueryClient();
 * queryClient.invalidateQueries({ queryKey: ['users'] });
 * ```
 */
export function getQueryClient(): QueryClient {
  if (!globalQueryClient) {
    globalQueryClient = createQueryClient();
  }
  return globalQueryClient;
}

/**
 * 重置全局 QueryClient（主要用于测试）
 */
export function resetQueryClient(): void {
  if (globalQueryClient) {
    globalQueryClient.clear();
    globalQueryClient = null;
  }
}

// ========================
// 缓存操作工具函数
// ========================

/**
 * 使指定 key 的查询失效
 *
 * @param queryKey - 要失效的 query key
 *
 * @example
 * ```ts
 * // 使所有用户查询失效
 * invalidateQueries(['users']);
 *
 * // 使特定用户详情失效
 * invalidateQueries(['users', 'detail', userId]);
 * ```
 */
export function invalidateQueries(queryKey: readonly unknown[]): Promise<void> {
  return getQueryClient().invalidateQueries({ queryKey });
}

/**
 * 预取查询数据
 *
 * @param queryKey - query key
 * @param queryFn - 查询函数
 *
 * @example
 * ```ts
 * await prefetchQuery(['users', 'detail', userId], () => fetchUser(userId));
 * ```
 */
export function prefetchQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>
): Promise<void> {
  return getQueryClient().prefetchQuery({ queryKey, queryFn });
}

/**
 * 直接设置查询缓存数据
 *
 * @param queryKey - query key
 * @param data - 要设置的数据
 *
 * @example
 * ```ts
 * // 乐观更新
 * setQueryData(['users', 'detail', userId], updatedUser);
 * ```
 */
export function setQueryData<T>(
  queryKey: readonly unknown[],
  data: T | ((old: T | undefined) => T)
): void {
  getQueryClient().setQueryData(queryKey, data);
}

/**
 * 获取查询缓存数据
 *
 * @param queryKey - query key
 * @returns 缓存的数据，如果不存在则返回 undefined
 *
 * @example
 * ```ts
 * const user = getQueryData<User>(['users', 'detail', userId]);
 * ```
 */
export function getQueryData<T>(queryKey: readonly unknown[]): T | undefined {
  return getQueryClient().getQueryData(queryKey);
}

/**
 * 移除查询缓存
 *
 * @param queryKey - query key
 *
 * @example
 * ```ts
 * removeQueries(['users', 'detail', userId]);
 * ```
 */
export function removeQueries(queryKey: readonly unknown[]): void {
  getQueryClient().removeQueries({ queryKey });
}

/**
 * 取消正在进行的查询
 *
 * @param queryKey - query key
 *
 * @example
 * ```ts
 * // 在组件卸载时取消查询
 * cancelQueries(['messages', 'list', chatId]);
 * ```
 */
export function cancelQueries(queryKey: readonly unknown[]): Promise<void> {
  return getQueryClient().cancelQueries({ queryKey });
}

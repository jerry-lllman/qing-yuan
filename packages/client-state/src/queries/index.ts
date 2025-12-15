/**
 * TanStack Query 配置导出
 */

// Query Client
export {
  createQueryClient,
  getQueryClient,
  resetQueryClient,
  invalidateQueries,
  prefetchQuery,
  setQueryData,
  getQueryData,
  removeQueries,
  cancelQueries,
  DEFAULT_STALE_TIME,
  DEFAULT_GC_TIME,
  DEFAULT_RETRY_COUNT,
} from './query-client';

// Query Keys
export {
  queryKeys,
  userKeys,
  chatKeys,
  messageKeys,
  contactKeys,
  groupKeys,
  notificationKeys,
} from './keys';

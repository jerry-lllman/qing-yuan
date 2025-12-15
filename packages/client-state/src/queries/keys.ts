/**
 * Query Key 工厂
 * 统一管理所有 TanStack Query 的 key
 *
 * 设计原则：
 * 1. 使用层级结构，便于批量失效
 * 2. 使用 as const 确保类型安全
 * 3. 参数化的 key 使用函数返回
 */

// ========================
// 用户相关
// ========================

export const userKeys = {
  /** 所有用户相关查询 */
  all: ['users'] as const,

  /** 用户列表 */
  lists: () => [...userKeys.all, 'list'] as const,

  /** 带筛选条件的用户列表 */
  list: (filters: Record<string, unknown>) => [...userKeys.lists(), filters] as const,

  /** 用户详情 */
  details: () => [...userKeys.all, 'detail'] as const,

  /** 单个用户详情 */
  detail: (userId: string) => [...userKeys.details(), userId] as const,

  /** 用户搜索 */
  search: (query: string) => [...userKeys.all, 'search', query] as const,

  /** 当前用户 */
  me: () => [...userKeys.all, 'me'] as const,

  /** 用户设置 */
  settings: () => [...userKeys.all, 'settings'] as const,
};

// ========================
// 会话相关
// ========================

export const chatKeys = {
  /** 所有会话相关查询 */
  all: ['chats'] as const,

  /** 会话列表 */
  lists: () => [...chatKeys.all, 'list'] as const,

  /** 带筛选条件的会话列表 */
  list: (filters?: { type?: string }) => [...chatKeys.lists(), filters] as const,

  /** 会话详情 */
  details: () => [...chatKeys.all, 'detail'] as const,

  /** 单个会话详情 */
  detail: (chatId: string) => [...chatKeys.details(), chatId] as const,

  /** 会话成员 */
  members: (chatId: string) => [...chatKeys.detail(chatId), 'members'] as const,
};

// ========================
// 消息相关
// ========================

export const messageKeys = {
  /** 所有消息相关查询 */
  all: ['messages'] as const,

  /** 某个会话的消息 */
  chat: (chatId: string) => [...messageKeys.all, 'chat', chatId] as const,

  /** 某个会话的消息列表（分页） */
  list: (chatId: string, cursor?: string) => [...messageKeys.chat(chatId), 'list', cursor] as const,

  /** 单条消息详情 */
  detail: (messageId: string) => [...messageKeys.all, 'detail', messageId] as const,

  /** 消息搜索 */
  search: (chatId: string, query: string) =>
    [...messageKeys.chat(chatId), 'search', query] as const,
};

// ========================
// 联系人相关
// ========================

export const contactKeys = {
  /** 所有联系人相关查询 */
  all: ['contacts'] as const,

  /** 联系人列表 */
  lists: () => [...contactKeys.all, 'list'] as const,

  /** 带筛选条件的联系人列表 */
  list: (filters?: { status?: string }) => [...contactKeys.lists(), filters] as const,

  /** 好友请求列表 */
  requests: () => [...contactKeys.all, 'requests'] as const,

  /** 收到的好友请求 */
  receivedRequests: () => [...contactKeys.requests(), 'received'] as const,

  /** 发送的好友请求 */
  sentRequests: () => [...contactKeys.requests(), 'sent'] as const,
};

// ========================
// 群组相关
// ========================

export const groupKeys = {
  /** 所有群组相关查询 */
  all: ['groups'] as const,

  /** 群组列表 */
  lists: () => [...groupKeys.all, 'list'] as const,

  /** 带筛选条件的群组列表 */
  list: (filters?: Record<string, unknown>) => [...groupKeys.lists(), filters] as const,

  /** 群组详情 */
  details: () => [...groupKeys.all, 'detail'] as const,

  /** 单个群组详情 */
  detail: (groupId: string) => [...groupKeys.details(), groupId] as const,

  /** 群组成员 */
  members: (groupId: string) => [...groupKeys.detail(groupId), 'members'] as const,

  /** 群组设置 */
  settings: (groupId: string) => [...groupKeys.detail(groupId), 'settings'] as const,
};

// ========================
// 通知相关
// ========================

export const notificationKeys = {
  /** 所有通知相关查询 */
  all: ['notifications'] as const,

  /** 通知列表 */
  list: () => [...notificationKeys.all, 'list'] as const,

  /** 未读通知数量 */
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

// ========================
// 统一导出
// ========================

export const queryKeys = {
  users: userKeys,
  chats: chatKeys,
  messages: messageKeys,
  contacts: contactKeys,
  groups: groupKeys,
  notifications: notificationKeys,
} as const;

/**
 * Hooks 导出
 */

export { useAuth, type AuthApi, type UseAuthOptions, type UseAuthReturn } from './use-auth';

export {
  useChat,
  useChatById,
  useHasUnread,
  useUnreadChatCount,
  type ChatApi,
  type UseChatOptions,
  type UseChatReturn,
} from './use-chat';

export {
  useMessage,
  useMessageById,
  useHasPendingMessages,
  useFailedMessageCount,
  getFailedMessages,
  type MessageApi,
  type UseMessageOptions,
  type UseMessageReturn,
} from './use-message';

export {
  useContact,
  useFriend,
  useIsFriend,
  useIsBlocked,
  useOnlineStatus,
  usePendingRequestCount,
  type ContactApi,
  type UseContactOptions,
  type UseContactReturn,
} from './use-contact';

export {
  useSearch,
  type SearchApi,
  type UseSearchOptions,
  type UseSearchReturn,
} from './use-search';

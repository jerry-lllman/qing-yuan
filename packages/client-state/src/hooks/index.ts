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

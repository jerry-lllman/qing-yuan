export * from './http-client';
// 导出 Auth API 工厂
export { createAuthApi, type AuthApi } from './auth';
export { createSearchApi, type SearchApi } from './search';
export { createContactApi, type ContactApi } from './contact';
export {
  createMessageApi,
  type MessageApi,
  type GetMessagesParams,
  type GetMessagesResponse,
} from './message';
export {
  createChatApi,
  type ChatApi,
  type ChatConversation,
  type CreatePrivateChatRequest,
  type CreateGroupChatRequest,
  type UpdateConversationRequest,
} from './chat';

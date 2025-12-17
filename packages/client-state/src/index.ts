/**
 * @qing-yuan/client-state
 * 客户端状态管理层
 */

// Stores (只导出 store 本身，不导出 selectors 以避免与 hooks 命名冲突)
export { useAuthStore, AuthStatus, type AuthState } from './stores/auth.store';
export { useChatStore, type ChatState } from './stores/chat.store';
export { useContactStore, type ContactState } from './stores/contact.store';
export { useMessageStore, type MessageState } from './stores/message.store';
export { useUIStore, type UIState } from './stores/ui.store';

// Queries (TanStack Query)
export * from './queries';

// Hooks (业务 hooks，包含 API 集成)
export * from './hooks';

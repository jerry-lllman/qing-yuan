/**
 * UI 状态管理
 * 负责侧边栏、主题、模态框、Toast 等 UI 状态
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ========================
// 类型定义
// ========================

/** 主题类型 */
export type Theme = 'light' | 'dark' | 'system';

/** 模态框类型 */
export type ModalType =
  | 'settings'
  | 'profile'
  | 'createGroup'
  | 'addFriend'
  | 'userInfo'
  | 'imagePreview'
  | 'confirm'
  | null;

/** 模态框数据 */
export interface ModalData {
  /** 用户 ID（用于 userInfo 模态框） */
  userId?: string;
  /** 图片 URL（用于 imagePreview 模态框） */
  imageUrl?: string;
  /** 图片列表（用于 imagePreview 模态框，支持切换） */
  imageUrls?: string[];
  /** 当前图片索引 */
  imageIndex?: number;
  /** 确认框标题 */
  confirmTitle?: string;
  /** 确认框内容 */
  confirmMessage?: string;
  /** 确认框回调 */
  onConfirm?: () => void;
  /** 取消框回调 */
  onCancel?: () => void;
}

/** Toast 类型 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/** Toast 消息 */
export interface Toast {
  /** 唯一 ID */
  id: string;
  /** 类型 */
  type: ToastType;
  /** 消息内容 */
  message: string;
  /** 持续时间（毫秒），0 表示不自动关闭 */
  duration: number;
  /** 创建时间 */
  createdAt: Date;
}

/** 侧边栏面板类型 */
export type SidebarPanel = 'chats' | 'contacts' | 'settings';

/** UI 状态 */
export interface UIState {
  // ========== 状态 ==========
  /** 侧边栏是否展开 */
  sidebarOpen: boolean;
  /** 当前侧边栏面板 */
  sidebarPanel: SidebarPanel;
  /** 当前主题 */
  theme: Theme;
  /** 当前打开的模态框 */
  activeModal: ModalType;
  /** 模态框数据 */
  modalData: ModalData;
  /** Toast 列表 */
  toasts: Toast[];
  /** 是否显示表情选择器 */
  showEmojiPicker: boolean;
  /** 是否正在搜索 */
  isSearching: boolean;
  /** 搜索关键词 */
  searchQuery: string;

  // ========== 侧边栏操作 ==========
  /** 切换侧边栏 */
  toggleSidebar: () => void;
  /** 设置侧边栏状态 */
  setSidebarOpen: (open: boolean) => void;
  /** 设置侧边栏面板 */
  setSidebarPanel: (panel: SidebarPanel) => void;

  // ========== 主题操作 ==========
  /** 设置主题 */
  setTheme: (theme: Theme) => void;

  // ========== 模态框操作 ==========
  /** 打开模态框 */
  openModal: (type: ModalType, data?: ModalData) => void;
  /** 关闭模态框 */
  closeModal: () => void;

  // ========== Toast 操作 ==========
  /** 添加 Toast */
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => string;
  /** 移除 Toast */
  removeToast: (id: string) => void;
  /** 清空所有 Toast */
  clearToasts: () => void;

  // ========== 其他操作 ==========
  /** 切换表情选择器 */
  toggleEmojiPicker: () => void;
  /** 设置表情选择器状态 */
  setShowEmojiPicker: (show: boolean) => void;
  /** 设置搜索状态 */
  setSearching: (searching: boolean) => void;
  /** 设置搜索关键词 */
  setSearchQuery: (query: string) => void;

  /** 重置状态 */
  reset: () => void;
}

// ========================
// 初始状态
// ========================

const initialState: Pick<
  UIState,
  | 'sidebarOpen'
  | 'sidebarPanel'
  | 'theme'
  | 'activeModal'
  | 'modalData'
  | 'toasts'
  | 'showEmojiPicker'
  | 'isSearching'
  | 'searchQuery'
> = {
  sidebarOpen: true,
  sidebarPanel: 'chats',
  theme: 'system',
  activeModal: null,
  modalData: {},
  toasts: [],
  showEmojiPicker: false,
  isSearching: false,
  searchQuery: '',
};

// ========================
// 工具函数
// ========================

/** 生成唯一 ID */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ========================
// Store 实现
// ========================

/**
 * UI Store
 *
 * 主题和侧边栏状态需要持久化
 */
export const useUIStore = create<UIState>()(
  devtools(
    persist(
      immer((set) => ({
        // ========== 初始状态 ==========
        ...initialState,

        // ========== 侧边栏操作 ==========
        toggleSidebar: () =>
          set((state: UIState) => {
            state.sidebarOpen = !state.sidebarOpen;
          }),

        setSidebarOpen: (open) =>
          set((state: UIState) => {
            state.sidebarOpen = open;
          }),

        setSidebarPanel: (panel) =>
          set((state: UIState) => {
            state.sidebarPanel = panel;
          }),

        // ========== 主题操作 ==========
        setTheme: (theme) =>
          set((state: UIState) => {
            state.theme = theme;
          }),

        // ========== 模态框操作 ==========
        openModal: (type, data = {}) =>
          set((state: UIState) => {
            state.activeModal = type;
            state.modalData = data;
          }),

        closeModal: () =>
          set((state: UIState) => {
            state.activeModal = null;
            state.modalData = {};
          }),

        // ========== Toast 操作 ==========
        addToast: (toast) => {
          const id = generateId();
          set((state: UIState) => {
            state.toasts.push({
              ...toast,
              id,
              createdAt: new Date(),
            });
          });
          return id;
        },

        removeToast: (id) =>
          set((state: UIState) => {
            const index = state.toasts.findIndex((t) => t.id === id);
            if (index !== -1) {
              state.toasts.splice(index, 1);
            }
          }),

        clearToasts: () =>
          set((state: UIState) => {
            state.toasts = [];
          }),

        // ========== 其他操作 ==========
        toggleEmojiPicker: () =>
          set((state: UIState) => {
            state.showEmojiPicker = !state.showEmojiPicker;
          }),

        setShowEmojiPicker: (show) =>
          set((state: UIState) => {
            state.showEmojiPicker = show;
          }),

        setSearching: (searching) =>
          set((state: UIState) => {
            state.isSearching = searching;
            if (!searching) {
              state.searchQuery = '';
            }
          }),

        setSearchQuery: (query) =>
          set((state: UIState) => {
            state.searchQuery = query;
          }),

        // ========== 重置 ==========
        reset: () =>
          set(() => ({
            ...initialState,
            // 保留主题设置
          })),
      })),
      {
        name: 'ui-storage',
        // 只持久化主题和侧边栏状态
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
          sidebarPanel: state.sidebarPanel,
        }),
      }
    ),
    { name: 'UIStore' }
  )
);

// ========================
// 工具函数（非 React 环境）
// ========================

/**
 * 获取当前主题
 */
export function getTheme(): Theme {
  return useUIStore.getState().theme;
}

/**
 * 获取实际主题（处理 system）
 */
export function getResolvedTheme(): 'light' | 'dark' {
  const theme = useUIStore.getState().theme;
  if (theme === 'system') {
    // 检测系统主题
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return theme;
}

/**
 * 显示成功 Toast
 */
export function showSuccessToast(message: string, duration = 3000): string {
  return useUIStore.getState().addToast({ type: 'success', message, duration });
}

/**
 * 显示错误 Toast
 */
export function showErrorToast(message: string, duration = 5000): string {
  return useUIStore.getState().addToast({ type: 'error', message, duration });
}

/**
 * 显示警告 Toast
 */
export function showWarningToast(message: string, duration = 4000): string {
  return useUIStore.getState().addToast({ type: 'warning', message, duration });
}

/**
 * 显示信息 Toast
 */
export function showInfoToast(message: string, duration = 3000): string {
  return useUIStore.getState().addToast({ type: 'info', message, duration });
}

/**
 * 打开确认框
 */
export function openConfirmModal(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
): void {
  useUIStore.getState().openModal('confirm', {
    confirmTitle: title,
    confirmMessage: message,
    onConfirm,
    onCancel,
  });
}

/**
 * 打开图片预览
 */
export function openImagePreview(imageUrl: string): void;
export function openImagePreview(imageUrls: string[], index?: number): void;
export function openImagePreview(imageUrlOrUrls: string | string[], index = 0): void {
  if (Array.isArray(imageUrlOrUrls)) {
    useUIStore.getState().openModal('imagePreview', {
      imageUrls: imageUrlOrUrls,
      imageIndex: index,
      imageUrl: imageUrlOrUrls[index],
    });
  } else {
    useUIStore.getState().openModal('imagePreview', {
      imageUrl: imageUrlOrUrls,
    });
  }
}

/**
 * 打开用户信息模态框
 */
export function openUserInfoModal(userId: string): void {
  useUIStore.getState().openModal('userInfo', { userId });
}

/**
 * 关闭模态框
 */
export function closeModal(): void {
  useUIStore.getState().closeModal();
}

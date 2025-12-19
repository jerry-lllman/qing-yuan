/**
 * UI 状态管理测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useUIStore,
  getTheme,
  getResolvedTheme,
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast,
  openConfirmModal,
  openImagePreview,
  openUserInfoModal,
  closeModal,
  type Toast,
} from './ui.store';

describe('UIStore', () => {
  beforeEach(() => {
    useUIStore.getState().reset();
  });

  // ========================
  // 侧边栏操作测试
  // ========================

  describe('Sidebar', () => {
    describe('toggleSidebar', () => {
      it('should toggle sidebar state', () => {
        const { toggleSidebar } = useUIStore.getState();

        // 初始状态是打开的
        expect(useUIStore.getState().sidebarOpen).toBe(true);

        toggleSidebar();
        expect(useUIStore.getState().sidebarOpen).toBe(false);

        toggleSidebar();
        expect(useUIStore.getState().sidebarOpen).toBe(true);
      });
    });

    describe('setSidebarOpen', () => {
      it('should set sidebar open state', () => {
        const { setSidebarOpen } = useUIStore.getState();

        setSidebarOpen(false);
        expect(useUIStore.getState().sidebarOpen).toBe(false);

        setSidebarOpen(true);
        expect(useUIStore.getState().sidebarOpen).toBe(true);
      });
    });

    describe('setSidebarPanel', () => {
      it('should set sidebar panel', () => {
        const { setSidebarPanel } = useUIStore.getState();

        expect(useUIStore.getState().sidebarPanel).toBe('chats');

        setSidebarPanel('contacts');
        expect(useUIStore.getState().sidebarPanel).toBe('contacts');

        setSidebarPanel('settings');
        expect(useUIStore.getState().sidebarPanel).toBe('settings');
      });
    });
  });

  // ========================
  // 主题操作测试
  // ========================

  describe('Theme', () => {
    describe('setTheme', () => {
      it('should set theme', () => {
        const { setTheme } = useUIStore.getState();

        expect(useUIStore.getState().theme).toBe('system');

        setTheme('dark');
        expect(useUIStore.getState().theme).toBe('dark');

        setTheme('light');
        expect(useUIStore.getState().theme).toBe('light');

        setTheme('system');
        expect(useUIStore.getState().theme).toBe('system');
      });
    });

    describe('getTheme', () => {
      it('should return current theme', () => {
        useUIStore.getState().setTheme('dark');
        expect(getTheme()).toBe('dark');
      });
    });

    describe('getResolvedTheme', () => {
      it('should return theme when not system', () => {
        useUIStore.getState().setTheme('dark');
        expect(getResolvedTheme()).toBe('dark');

        useUIStore.getState().setTheme('light');
        expect(getResolvedTheme()).toBe('light');
      });

      it('should return light as default for system theme', () => {
        useUIStore.getState().setTheme('system');
        // 在 Node 环境中，没有 window.matchMedia，默认返回 light
        expect(getResolvedTheme()).toBe('light');
      });
    });
  });

  // ========================
  // 模态框操作测试
  // ========================

  describe('Modal', () => {
    describe('openModal', () => {
      it('should open modal without data', () => {
        const { openModal } = useUIStore.getState();

        openModal('settings');

        const state = useUIStore.getState();
        expect(state.activeModal).toBe('settings');
        expect(state.modalData).toEqual({});
      });

      it('should open modal with data', () => {
        const { openModal } = useUIStore.getState();

        openModal('userInfo', { userId: 'user-123' });

        const state = useUIStore.getState();
        expect(state.activeModal).toBe('userInfo');
        expect(state.modalData.userId).toBe('user-123');
      });

      it('should open image preview modal', () => {
        const { openModal } = useUIStore.getState();

        openModal('imagePreview', { imageUrl: 'https://example.com/image.jpg' });

        const state = useUIStore.getState();
        expect(state.activeModal).toBe('imagePreview');
        expect(state.modalData.imageUrl).toBe('https://example.com/image.jpg');
      });

      it('should open confirm modal', () => {
        const onConfirm = () => {};
        const onCancel = () => {};

        const { openModal } = useUIStore.getState();
        openModal('confirm', {
          confirmTitle: 'Delete?',
          confirmMessage: 'Are you sure?',
          onConfirm,
          onCancel,
        });

        const state = useUIStore.getState();
        expect(state.activeModal).toBe('confirm');
        expect(state.modalData.confirmTitle).toBe('Delete?');
        expect(state.modalData.confirmMessage).toBe('Are you sure?');
        expect(state.modalData.onConfirm).toBe(onConfirm);
        expect(state.modalData.onCancel).toBe(onCancel);
      });
    });

    describe('closeModal', () => {
      it('should close modal and clear data', () => {
        const { openModal, closeModal } = useUIStore.getState();

        openModal('userInfo', { userId: 'user-123' });
        closeModal();

        const state = useUIStore.getState();
        expect(state.activeModal).toBeNull();
        expect(state.modalData).toEqual({});
      });
    });

    describe('openConfirmModal', () => {
      it('should open confirm modal with utility function', () => {
        const onConfirm = () => {};
        const onCancel = () => {};

        openConfirmModal('Delete', 'Are you sure?', onConfirm, onCancel);

        const state = useUIStore.getState();
        expect(state.activeModal).toBe('confirm');
        expect(state.modalData.confirmTitle).toBe('Delete');
        expect(state.modalData.confirmMessage).toBe('Are you sure?');
      });
    });

    describe('openImagePreview', () => {
      it('should open image preview with single image', () => {
        openImagePreview('https://example.com/image.jpg');

        const state = useUIStore.getState();
        expect(state.activeModal).toBe('imagePreview');
        expect(state.modalData.imageUrl).toBe('https://example.com/image.jpg');
      });

      it('should open image preview with multiple images', () => {
        const images = [
          'https://example.com/1.jpg',
          'https://example.com/2.jpg',
          'https://example.com/3.jpg',
        ];
        openImagePreview(images, 1);

        const state = useUIStore.getState();
        expect(state.activeModal).toBe('imagePreview');
        expect(state.modalData.imageUrls).toEqual(images);
        expect(state.modalData.imageIndex).toBe(1);
        expect(state.modalData.imageUrl).toBe('https://example.com/2.jpg');
      });
    });

    describe('openUserInfoModal', () => {
      it('should open user info modal', () => {
        openUserInfoModal('user-123');

        const state = useUIStore.getState();
        expect(state.activeModal).toBe('userInfo');
        expect(state.modalData.userId).toBe('user-123');
      });
    });

    describe('closeModal utility', () => {
      it('should close modal with utility function', () => {
        openUserInfoModal('user-123');
        closeModal();

        expect(useUIStore.getState().activeModal).toBeNull();
      });
    });
  });

  // ========================
  // Toast 操作测试
  // ========================

  describe('Toast', () => {
    describe('addToast', () => {
      it('should add toast and return id', () => {
        const { addToast } = useUIStore.getState();

        const id = addToast({ type: 'success', message: 'Success!', duration: 3000 });

        expect(id).toBeTruthy();
        const state = useUIStore.getState();
        expect(state.toasts).toHaveLength(1);
        expect(state.toasts[0]?.type).toBe('success');
        expect(state.toasts[0]?.message).toBe('Success!');
        expect(state.toasts[0]?.duration).toBe(3000);
        expect(state.toasts[0]?.id).toBe(id);
        expect(state.toasts[0]?.createdAt).toBeInstanceOf(Date);
      });

      it('should add multiple toasts', () => {
        const { addToast } = useUIStore.getState();

        addToast({ type: 'success', message: 'Success!', duration: 3000 });
        addToast({ type: 'error', message: 'Error!', duration: 5000 });
        addToast({ type: 'warning', message: 'Warning!', duration: 4000 });

        expect(useUIStore.getState().toasts).toHaveLength(3);
      });
    });

    describe('removeToast', () => {
      it('should remove toast by id', () => {
        const { addToast, removeToast } = useUIStore.getState();

        const id1 = addToast({ type: 'success', message: 'Toast 1', duration: 3000 });
        const id2 = addToast({ type: 'error', message: 'Toast 2', duration: 3000 });

        removeToast(id1);

        const state = useUIStore.getState();
        expect(state.toasts).toHaveLength(1);
        expect(state.toasts[0]?.id).toBe(id2);
      });

      it('should do nothing if toast not found', () => {
        const { addToast, removeToast } = useUIStore.getState();

        addToast({ type: 'success', message: 'Toast 1', duration: 3000 });
        removeToast('non-existent');

        expect(useUIStore.getState().toasts).toHaveLength(1);
      });
    });

    describe('clearToasts', () => {
      it('should clear all toasts', () => {
        const { addToast, clearToasts } = useUIStore.getState();

        addToast({ type: 'success', message: 'Toast 1', duration: 3000 });
        addToast({ type: 'error', message: 'Toast 2', duration: 3000 });
        clearToasts();

        expect(useUIStore.getState().toasts).toHaveLength(0);
      });
    });

    describe('Toast utility functions', () => {
      it('showSuccessToast should create success toast', () => {
        const id = showSuccessToast('Operation successful');

        const toast = useUIStore.getState().toasts.find((t) => t.id === id);
        expect(toast?.type).toBe('success');
        expect(toast?.message).toBe('Operation successful');
        expect(toast?.duration).toBe(3000);
      });

      it('showErrorToast should create error toast', () => {
        const id = showErrorToast('Something went wrong');

        const toast = useUIStore.getState().toasts.find((t) => t.id === id);
        expect(toast?.type).toBe('error');
        expect(toast?.message).toBe('Something went wrong');
        expect(toast?.duration).toBe(5000);
      });

      it('showWarningToast should create warning toast', () => {
        const id = showWarningToast('Be careful');

        const toast = useUIStore.getState().toasts.find((t) => t.id === id);
        expect(toast?.type).toBe('warning');
        expect(toast?.message).toBe('Be careful');
        expect(toast?.duration).toBe(4000);
      });

      it('showInfoToast should create info toast', () => {
        const id = showInfoToast('FYI');

        const toast = useUIStore.getState().toasts.find((t) => t.id === id);
        expect(toast?.type).toBe('info');
        expect(toast?.message).toBe('FYI');
        expect(toast?.duration).toBe(3000);
      });

      it('should allow custom duration', () => {
        const id = showSuccessToast('Custom duration', 10000);

        const toast = useUIStore.getState().toasts.find((t) => t.id === id);
        expect(toast?.duration).toBe(10000);
      });
    });
  });

  // ========================
  // 表情选择器测试
  // ========================

  describe('Emoji Picker', () => {
    describe('toggleEmojiPicker', () => {
      it('should toggle emoji picker state', () => {
        const { toggleEmojiPicker } = useUIStore.getState();

        expect(useUIStore.getState().showEmojiPicker).toBe(false);

        toggleEmojiPicker();
        expect(useUIStore.getState().showEmojiPicker).toBe(true);

        toggleEmojiPicker();
        expect(useUIStore.getState().showEmojiPicker).toBe(false);
      });
    });

    describe('setShowEmojiPicker', () => {
      it('should set emoji picker state', () => {
        const { setShowEmojiPicker } = useUIStore.getState();

        setShowEmojiPicker(true);
        expect(useUIStore.getState().showEmojiPicker).toBe(true);

        setShowEmojiPicker(false);
        expect(useUIStore.getState().showEmojiPicker).toBe(false);
      });
    });
  });

  // ========================
  // 搜索状态测试
  // ========================

  describe('Search', () => {
    describe('setSearching', () => {
      it('should set searching state', () => {
        const { setSearching } = useUIStore.getState();

        setSearching(true);
        expect(useUIStore.getState().isSearching).toBe(true);

        setSearching(false);
        expect(useUIStore.getState().isSearching).toBe(false);
      });

      it('should clear search query when stopping search', () => {
        const { setSearching, setSearchQuery } = useUIStore.getState();

        setSearchQuery('test query');
        setSearching(true);
        expect(useUIStore.getState().searchQuery).toBe('test query');

        setSearching(false);
        expect(useUIStore.getState().searchQuery).toBe('');
      });
    });

    describe('setSearchQuery', () => {
      it('should set search query', () => {
        const { setSearchQuery } = useUIStore.getState();

        setSearchQuery('hello');
        expect(useUIStore.getState().searchQuery).toBe('hello');

        setSearchQuery('world');
        expect(useUIStore.getState().searchQuery).toBe('world');
      });
    });
  });

  // ========================
  // Reset 测试
  // ========================

  describe('reset', () => {
    it('should reset all state to initial', () => {
      const state = useUIStore.getState();

      // 修改各种状态
      state.setSidebarOpen(false);
      state.setSidebarPanel('contacts');
      state.setTheme('dark');
      state.openModal('settings');
      state.addToast({ type: 'success', message: 'test', duration: 3000 });
      state.setShowEmojiPicker(true);
      state.setSearching(true);
      state.setSearchQuery('test');

      // 重置
      state.reset();

      const resetState = useUIStore.getState();
      expect(resetState.sidebarOpen).toBe(true);
      expect(resetState.sidebarPanel).toBe('chats');
      expect(resetState.theme).toBe('system');
      expect(resetState.activeModal).toBeNull();
      expect(resetState.modalData).toEqual({});
      expect(resetState.toasts).toHaveLength(0);
      expect(resetState.showEmojiPicker).toBe(false);
      expect(resetState.isSearching).toBe(false);
      expect(resetState.searchQuery).toBe('');
    });
  });
});

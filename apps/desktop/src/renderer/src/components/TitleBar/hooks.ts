/**
 * TitleBar 相关自定义 Hooks
 */

import { useCallback, useEffect, useState } from 'react';

/**
 * 窗口控制 Hook
 *
 * 管理窗口最大化状态和窗口操作
 */
export function useWindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);

  // 检查当前最大化状态
  const checkMaximized = useCallback(async () => {
    const maximized = await window.windowControls?.isMaximized();
    setIsMaximized(maximized ?? false);
  }, []);

  useEffect(() => {
    // 初始检查最大化状态（使用 IIFE 避免 lint 警告）
    void (async () => {
      const maximized = await window.windowControls?.isMaximized();
      setIsMaximized(maximized ?? false);
    })();

    // 监听窗口大小变化来更新最大化状态
    const handleResize = () => {
      void checkMaximized();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkMaximized]);

  const minimize = useCallback(() => {
    window.windowControls?.minimize();
  }, []);

  const maximize = useCallback(async () => {
    window.windowControls?.maximize();
    // 延迟更新状态，等待窗口状态变化
    setTimeout(() => {
      checkMaximized();
    }, 100);
  }, [checkMaximized]);

  const close = useCallback(() => {
    window.windowControls?.close();
  }, []);

  return {
    isMaximized,
    minimize,
    maximize,
    close,
  };
}

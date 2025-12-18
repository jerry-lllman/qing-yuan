/**
 * 路由守卫 - 保护需要登录的页面
 *
 * 在双窗口模式下，如果用户未登录，会切换到认证窗口
 */

import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthStore, AuthStatus } from '@qyra/client-state';

export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    // 未认证，切换到认证窗口
    if (status !== AuthStatus.AUTHENTICATED) {
      window.windowControls.openAuthWindow();
    }
  }, [status]);

  // 未认证时显示加载状态（马上会切换窗口）
  if (status !== AuthStatus.AUTHENTICATED) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">正在跳转登录...</div>
      </div>
    );
  }

  return <Outlet />;
}

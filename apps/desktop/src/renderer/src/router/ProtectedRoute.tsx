/**
 * 路由守卫 - 保护需要登录的页面
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore, AuthStatus } from '@qyra/client-state';

export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  // 未认证，跳转到登录页
  if (status !== AuthStatus.AUTHENTICATED) {
    // 保存当前路径，登录后可以跳转回来
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

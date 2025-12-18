/**
 * 认证窗口路由配置
 * 仅包含登录和注册页面
 */

import { createHashRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const AuthLayout = lazy(() => import('@/layouts/AuthLayout'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));

// Loading fallback
const PageLoading = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="text-muted-foreground">加载中...</div>
  </div>
);

// 懒加载包装器
const LazyWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoading />}>{children}</Suspense>
);

export const authRouter = createHashRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    // 认证相关页面 (登录/注册) 使用 AuthLayout
    element: (
      <LazyWrapper>
        <AuthLayout />
      </LazyWrapper>
    ),
    children: [
      {
        path: '/login',
        element: (
          <LazyWrapper>
            <LoginPage />
          </LazyWrapper>
        ),
      },
      {
        path: '/register',
        element: (
          <LazyWrapper>
            <RegisterPage />
          </LazyWrapper>
        ),
      },
    ],
  },
]);

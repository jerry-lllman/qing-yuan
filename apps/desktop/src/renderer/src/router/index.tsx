/**
 * 路由配置
 * 使用 HashRouter 适配 Electron file:// 协议
 */

import { createHashRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

// Pages - 懒加载
import { lazy, Suspense } from 'react';

const AuthLayout = lazy(() => import('@/layouts/AuthLayout'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const MainLayout = lazy(() => import('@/layouts/MainLayout'));
const ChatPage = lazy(() => import('@/pages/chat/ChatPage'));

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

export const router = createHashRouter([
  {
    path: '/',
    element: <Navigate to="/chat" replace />,
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
  {
    // 需要登录的路由
    element: <ProtectedRoute />,
    children: [
      {
        element: (
          <LazyWrapper>
            <MainLayout />
          </LazyWrapper>
        ),
        children: [
          {
            path: '/chat',
            element: (
              <LazyWrapper>
                <ChatPage />
              </LazyWrapper>
            ),
          },
          {
            path: '/chat/:conversationId',
            element: (
              <LazyWrapper>
                <ChatPage />
              </LazyWrapper>
            ),
          },
        ],
      },
    ],
  },
]);

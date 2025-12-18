/**
 * 主窗口路由配置
 * 使用 HashRouter 适配 Electron file:// 协议
 *
 * 注意：登录/注册页面在独立的认证窗口中，见 auth-router.tsx
 */

import { createHashRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

// Pages - 懒加载
import { lazy, Suspense } from 'react';

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
    // 主窗口所有路由都需要登录保护
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

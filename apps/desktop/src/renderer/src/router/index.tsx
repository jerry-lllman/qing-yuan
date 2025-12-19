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
import PageLoading from '@/components/PageLoading';

const MainLayout = lazy(() => import('@/layouts/MainLayout'));
const ChatPage = lazy(() => import('@/pages/chat/ChatPage'));
const ContactPage = lazy(() => import('@/pages/contact/ContactPage'));
const ConversationPage = lazy(() => import('@/pages/chat/conversation/ConversationPage'));

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
          <Suspense fallback={<PageLoading />}>
            <MainLayout />
          </Suspense>
        ),
        children: [
          {
            path: '/chat',
            element: (
              <Suspense fallback={<PageLoading />}>
                <ChatPage />
              </Suspense>
            ),
            children: [
              {
                path: ':conversationId',
                element: (
                  <Suspense fallback={<PageLoading />}>
                    <ConversationPage />
                  </Suspense>
                ),
              },
            ],
          },
          {
            path: '/contacts',
            element: (
              <Suspense fallback={<PageLoading />}>
                <ContactPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
]);

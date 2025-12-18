/**
 * 认证窗口路由配置
 * 仅包含登录和注册页面
 */

import { createHashRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import PageLoading from '@/components/PageLoading';

const AuthLayout = lazy(() => import('@/layouts/AuthLayout'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));

export const authRouter = createHashRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    // 认证相关页面 (登录/注册) 使用 AuthLayout
    element: (
      <Suspense fallback={<PageLoading />}>
        <AuthLayout />
      </Suspense>
    ),
    children: [
      {
        path: '/login',
        element: (
          <Suspense fallback={<PageLoading />}>
            <LoginPage />
          </Suspense>
        ),
      },
      {
        path: '/register',
        element: (
          <Suspense fallback={<PageLoading />}>
            <RegisterPage />
          </Suspense>
        ),
      },
    ],
  },
]);

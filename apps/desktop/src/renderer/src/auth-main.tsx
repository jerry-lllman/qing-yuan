/**
 * 认证窗口入口
 * 独立的小窗口用于登录和注册
 */

import './styles/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@qyra/client-state';
import { authRouter } from './router/auth-router';
import { initializeApp } from './lib/init';

// 初始化应用（配置 HttpClient）
initializeApp();

const queryClient = createQueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={authRouter} />
    </QueryClientProvider>
  </StrictMode>
);

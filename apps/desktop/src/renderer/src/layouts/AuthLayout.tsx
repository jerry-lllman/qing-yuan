/**
 * 认证页面布局 (登录/注册)
 *
 * 提供无边框窗口的拖拽区域
 */

import { Outlet } from 'react-router-dom';
import { TitleBar } from '@/components/TitleBar';
import { Toaster } from '@qyra/ui-web';

export default function AuthLayout() {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 顶部标题栏 - 提供窗口拖拽和控制 */}
      <TitleBar transparent />

      {/* 内容区域 */}
      <div className="flex-1 flex items-center justify-center">
        <Outlet />
      </div>
      <Toaster />
    </div>
  );
}

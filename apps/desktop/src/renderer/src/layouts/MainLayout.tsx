/**
 * 主界面布局 - QQ 风格三栏布局
 *
 * 结构（无边框窗口）：
 * ┌─────────────────────────────────────────────┐
 * │  TitleBar (macOS红绿灯 / Windows控制按钮)   │
 * ├──────┬────────────┬──────────────────────────┤
 * │      │            │                          │
 * │ Side │  ChatList  │    ChatArea              │
 * │ bar  │            │                          │
 * │      │            │                          │
 * └──────┴────────────┴──────────────────────────┘
 */

import { Outlet } from 'react-router-dom';
import { Toaster } from '@qyra/ui-web';

import { Sidebar } from '@/components/layout/Sidebar';
import { TitleBar } from '@/components/TitleBar';
import { useSocketSetup } from '@/hooks/use-socket-setup';

export default function MainLayout() {
  // 初始化 Socket 连接和事件监听
  useSocketSetup();

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 
        顶部标题栏 - 提供窗口拖拽和控制
        macOS: 显示原生红绿灯按钮
        Windows/Linux: 显示自定义窗口控制按钮
      */}
      <TitleBar showLogo showUserInfo className="shrink-0" />

      {/* 主内容区 */}
      <div className="p-2 flex-1 flex min-h-0">
        <div className="flex flex-1 gap-0.5 min-h-0">
          {/* 侧边栏 - 导航图标 */}
          <Sidebar />

          {/* 聊天区域 - 由子路由填充 */}
          <main className="flex-1 flex flex-col min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

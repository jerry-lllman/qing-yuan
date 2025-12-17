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
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatList } from '@/components/layout/ChatList';
import { TitleBar } from '@/components/TitleBar';

export default function MainLayout() {
  const isMac = navigator.platform.toLowerCase().includes('mac');

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 
        顶部标题栏 - 提供窗口拖拽和控制
        macOS: 显示原生红绿灯按钮
        Windows/Linux: 显示自定义窗口控制按钮
      */}
      <TitleBar className="shrink-0" />

      {/* 主内容区 */}
      <div className="flex flex-1 min-h-0">
        {/* 侧边栏 - 导航图标 */}
        <Sidebar className={isMac ? 'pt-0' : ''} />

        {/* 会话列表 */}
        <ChatList />

        {/* 聊天区域 - 由子路由填充 */}
        <main className="flex-1 flex flex-col min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

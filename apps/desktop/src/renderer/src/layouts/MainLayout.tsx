/**
 * 主界面布局 - QQ 风格三栏布局
 *
 * 结构：
 * ┌──────┬────────────┬──────────────────────┐
 * │      │            │                      │
 * │ Side │  ChatList  │    ChatArea          │
 * │ bar  │            │                      │
 * │      │            │                      │
 * └──────┴────────────┴──────────────────────┘
 */

import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatList } from '@/components/layout/ChatList';

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-background">
      {/* 侧边栏 - 导航图标 */}
      <Sidebar />

      {/* 会话列表 */}
      <ChatList />

      {/* 聊天区域 - 由子路由填充 */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}

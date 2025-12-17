/**
 * 侧边栏组件 - 导航图标
 */

import { useAuthStore } from '@qyra/client-state';
import { Button } from '@qyra/ui-web';
import { useNavigate, useLocation } from 'react-router-dom';
import type { ComponentType } from 'react';
import { MessageCircleMore, Users, Settings, LogOut } from 'lucide-react';

// ============ 类型定义 ============
interface NavItem {
  id: string;
  icon: ComponentType;
  title: string;
  className?: string;
  /** 导航路径（与 onClick 二选一） */
  path?: string;
  /** 自定义点击事件（与 path 二选一） */
  onClick?: () => void;
}

interface SidebarProps {
  className?: string;
  /** 主导航项（顶部） */
  navItems?: NavItem[];
  /** 底部导航项 */
  bottomNavItems?: NavItem[];
}

// ============ 默认配置 ============
const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'chat', path: '/chat', icon: MessageCircleMore, title: '消息' },
  { id: 'contacts', path: '/contacts', icon: Users, title: '联系人' },
];

const DEFAULT_BOTTOM_NAV_ITEMS: NavItem[] = [
  { id: 'settings', path: '/settings', icon: Settings, title: '设置' },
];

// ============ 工具函数 ============
/** 判断当前路由是否匹配（支持子路由） */
const checkIsActive = (pathname: string, targetPath: string): boolean => {
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
};

// ============ 子组件 ============
interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
}

function NavButton({ item, isActive }: NavButtonProps) {
  const navigate = useNavigate();
  const Icon = item.icon;

  const handleClick = () => {
    if (item.onClick) {
      item.onClick();
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      size="icon"
      className={`w-full h-10 ${item.className || ''}`}
      title={item.title}
      onClick={handleClick}
    >
      <Icon />
    </Button>
  );
}

// ============ 主组件 ============
export function Sidebar({ className }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);

  const DEFAULT_BOTTOM_NAVS = [
    ...DEFAULT_BOTTOM_NAV_ITEMS,
    // TODO: 后续这个按钮会放到设置页面
    {
      id: 'logout',
      icon: LogOut,
      title: '退出登录',
      className: 'hover:text-destructive',
      onClick: () => {
        logout();
        navigate('/login', { replace: true });
      },
    },
  ];

  return (
    <aside
      className={`w-16 rounded-l-md bg-background flex flex-col items-center py-4 px-2 ${className || ''}`}
    >
      {/* 主导航 */}
      <nav className="flex-1 flex flex-col items-center gap-2 w-full">
        {DEFAULT_NAV_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={item.path ? checkIsActive(location.pathname, item.path) : false}
          />
        ))}
      </nav>

      {/* 底部区域 */}
      <div className="flex flex-col items-center gap-2 w-full">
        {DEFAULT_BOTTOM_NAVS.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={item.path ? checkIsActive(location.pathname, item.path) : false}
          />
        ))}
      </div>
    </aside>
  );
}

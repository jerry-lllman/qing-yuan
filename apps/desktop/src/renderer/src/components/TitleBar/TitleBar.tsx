/**
 * TitleBar 组件
 *
 * 跨平台窗口标题栏：
 * - macOS: 使用原生红绿灯按钮，仅提供拖拽区域
 * - Windows/Linux: 完全自定义，包含窗口控制按钮
 */

import { cn } from '@qyra/ui-web';
import { isWindows } from '@qyra/shared';
import { useAuthStore } from '@qyra/client-state';
import lightLogo from '@qyra/assets/images/light-logo.png';

import { useWindowControls } from './hooks';
import { TitleBarLogo } from './TitleBarLogo';
import { UserInfo } from './UserInfo';
import { WindowControls } from './WindowControls';
import type { TitleBarProps } from './types';

export function TitleBar({
  transparent = false,
  showLogo = false,
  showUserInfo = false,
  className,
}: TitleBarProps) {
  const isWindowsOS = isWindows();
  const user = useAuthStore((state) => state.user);
  const { isMaximized, minimize, maximize, close } = useWindowControls();

  return (
    <div
      className={cn(
        'h-10 flex items-center justify-between app-drag-region',
        transparent ? 'bg-transparent' : 'bg-background',
        className
      )}
    >
      {/* 左侧 Logo 区域 */}
      <div className="mx-4 w-8 h-8">
        {isWindowsOS && showLogo && <TitleBarLogo src={lightLogo} />}
      </div>

      {/* 中间用户信息区域 */}
      <div className="flex flex-1">
        {showUserInfo && (
          <UserInfo
            avatar={user?.avatar}
            nickname={user?.nickname}
            username={user?.username}
            bio={user?.bio}
            className="ml-3"
          />
        )}
      </div>

      {/* 右侧窗口控制按钮（仅 Windows/Linux） */}
      {isWindowsOS && (
        <WindowControls
          isMaximized={isMaximized}
          onMinimize={minimize}
          onMaximize={maximize}
          onClose={close}
        />
      )}
    </div>
  );
}

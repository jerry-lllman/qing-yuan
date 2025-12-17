/**
 * TitleBar 组件
 *
 * 跨平台窗口标题栏：
 * - macOS: 使用原生红绿灯按钮，仅提供拖拽区域
 * - Windows/Linux: 完全自定义，包含窗口控制按钮
 */

import { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { cn } from '@qyra/ui-web';
import lightLogo from '@qyra/assets/images/light-logo.png';

interface TitleBarProps {
  /** 是否显示为透明背景（用于叠加在内容上） */
  transparent?: boolean;
  /** 自定义类名 */
  className?: string;
}

export function TitleBar({ transparent = false, className }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const isMac = !navigator.platform.toLowerCase().includes('mac');

  useEffect(() => {
    // 初始检查最大化状态
    const checkMaximized = async () => {
      const maximized = await window.windowControls?.isMaximized();
      setIsMaximized(maximized ?? false);
    };
    checkMaximized();

    // 监听窗口大小变化来更新最大化状态
    const handleResize = () => {
      checkMaximized();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMinimize = () => {
    window.windowControls?.minimize();
  };

  const handleMaximize = async () => {
    window.windowControls?.maximize();
    // 延迟更新状态，等待窗口状态变化
    setTimeout(async () => {
      const maximized = await window.windowControls?.isMaximized();
      setIsMaximized(maximized ?? false);
    }, 100);
  };

  const handleClose = () => {
    window.windowControls?.close();
  };

  // macOS: 只需要拖拽区域，红绿灯按钮由系统提供
  if (isMac) {
    return (
      <div
        className={cn(
          'h-10 flex items-center app-drag-region',
          transparent ? 'bg-transparent' : 'bg-background',
          className
        )}
      >
        {/* 左侧留空给红绿灯按钮 (约 80px) */}
        <div className="w-20 shrink-0" />
      </div>
    );
  }

  // Windows/Linux: 自定义窗口控制按钮
  return (
    <div
      className={cn(
        'h-10 flex items-center justify-between app-drag-region',
        transparent ? 'bg-transparent' : 'bg-background',
        className
      )}
    >
      {/* 左侧可放 logo 或标题 */}
      <div className="flex items-center px-4">
        <img src={lightLogo} className="w-8 h-8" />
      </div>

      {/* 右侧窗口控制按钮 */}
      <div className="flex app-no-drag">
        <button
          onClick={handleMinimize}
          className="w-12 h-10 hover:bg-muted flex items-center justify-center transition-colors"
          aria-label="最小化"
        >
          <Minus size={16} className="text-foreground/70" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-12 h-10 hover:bg-muted flex items-center justify-center transition-colors"
          aria-label={isMaximized ? '还原' : '最大化'}
        >
          {isMaximized ? (
            <Copy size={14} className="text-foreground/70" />
          ) : (
            <Square size={14} className="text-foreground/70" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="w-12 h-10 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors group"
          aria-label="关闭"
        >
          <X size={16} className="text-foreground/70 group-hover:text-white" />
        </button>
      </div>
    </div>
  );
}

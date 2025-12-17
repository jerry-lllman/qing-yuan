/**
 * WindowControls 组件
 *
 * Windows/Linux 平台的窗口控制按钮组
 * 包含：最小化、最大化/还原、关闭
 */

import { Copy, Minus, Square, X } from 'lucide-react';
import type { WindowControlsProps } from './types';

/** 控制按钮基础样式 */
const BUTTON_BASE_STYLES = 'w-12 h-10 flex items-center justify-center transition-colors';

/** 图标基础样式 */
const ICON_BASE_STYLES = 'text-foreground/70';

export function WindowControls({
  isMaximized,
  onMinimize,
  onMaximize,
  onClose,
}: WindowControlsProps) {
  return (
    <div className="flex app-no-drag ml-auto">
      {/* 最小化按钮 */}
      <button
        onClick={onMinimize}
        className={`${BUTTON_BASE_STYLES} hover:bg-muted`}
        aria-label="最小化"
      >
        <Minus size={16} className={ICON_BASE_STYLES} />
      </button>

      {/* 最大化/还原按钮 */}
      <button
        onClick={onMaximize}
        className={`${BUTTON_BASE_STYLES} hover:bg-muted`}
        aria-label={isMaximized ? '还原' : '最大化'}
      >
        {isMaximized ? (
          <Copy size={14} className={ICON_BASE_STYLES} />
        ) : (
          <Square size={14} className={ICON_BASE_STYLES} />
        )}
      </button>

      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className={`${BUTTON_BASE_STYLES} hover:bg-red-500 hover:text-white group`}
        aria-label="关闭"
      >
        <X size={16} className={`${ICON_BASE_STYLES} group-hover:text-white`} />
      </button>
    </div>
  );
}

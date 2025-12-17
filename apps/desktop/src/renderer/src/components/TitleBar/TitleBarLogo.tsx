/**
 * TitleBarLogo 组件
 *
 * 标题栏 Logo 展示
 */

import { cn } from '@qyra/ui-web';
import type { TitleBarLogoProps } from './types';

export function TitleBarLogo({ src, className }: TitleBarLogoProps) {
  return (
    <div className={cn('w-8 h-8', className)}>
      <img src={src} alt="App Logo" className="w-full h-full" />
    </div>
  );
}

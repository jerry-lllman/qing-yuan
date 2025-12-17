/**
 * UserInfo 组件
 *
 * 标题栏用户信息展示
 * 包含：头像、昵称/用户名、签名
 */

import { Avatar, AvatarFallback, AvatarImage, cn } from '@qyra/ui-web';
import type { UserInfoProps } from './types';

/** 默认未登录显示文本 */
const DEFAULT_DISPLAY_NAME = '未登录';

/** 头像 fallback 默认字符 */
const DEFAULT_AVATAR_FALLBACK = '?';

export function UserInfo({ avatar, nickname, username, bio, className }: UserInfoProps) {
  // 显示名称：优先昵称 > 用户名 > 默认文本
  const displayName = nickname || username || DEFAULT_DISPLAY_NAME;

  // 头像 fallback 字符：取显示名称首字符
  const avatarFallback = displayName.charAt(0) || DEFAULT_AVATAR_FALLBACK;

  return (
    <div className={cn('flex items-center gap-1 app-no-drag', className)}>
      {/* 用户头像 */}
      <Avatar className="w-8 h-8">
        <AvatarImage src={avatar ?? undefined} alt={nickname ?? undefined} />
        <AvatarFallback>{avatarFallback}</AvatarFallback>
      </Avatar>

      {/* 用户昵称/用户名 */}
      <div className="font-medium text-foreground truncate max-w-50">{displayName}</div>

      {/* 用户签名 */}
      {bio && <div className="text-sm text-foreground/70 truncate max-w-50">{bio}</div>}
    </div>
  );
}

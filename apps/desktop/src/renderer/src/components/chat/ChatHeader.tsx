/**
 * ChatHeader 组件
 * 聊天窗口头部，显示会话信息
 */

import { type FC, memo } from 'react';
import { cn, Avatar, AvatarFallback, AvatarImage, Button } from '@qyra/ui-web';
import { Phone, Video, MoreVertical, ArrowLeft, Users } from 'lucide-react';
import type { UserStatus } from '@qyra/shared';

export interface ChatHeaderProps {
  /** 会话名称（私聊为对方昵称，群聊为群名） */
  name: string;
  /** 头像 URL */
  avatar?: string | null;
  /** 是否为群聊 */
  isGroup?: boolean;
  /** 在线状态（私聊时显示） */
  status?: UserStatus;
  /** 群成员数量（群聊时显示） */
  memberCount?: number;
  /** 副标题（如"正在输入..."） */
  subtitle?: string;
  /** 返回按钮点击回调 */
  onBack?: () => void;
  /** 语音通话点击回调 */
  onVoiceCall?: () => void;
  /** 视频通话点击回调 */
  onVideoCall?: () => void;
  /** 更多选项点击回调 */
  onMoreClick?: () => void;
  /** 头部点击回调（查看会话详情） */
  onHeaderClick?: () => void;
  /** 是否显示返回按钮 */
  showBack?: boolean;
  /** 自定义类名 */
  className?: string;
}

/** 获取状态显示文本 */
function getStatusText(status?: UserStatus): string {
  switch (status) {
    case 'online':
      return '在线';
    case 'away':
      return '离开';
    case 'busy':
      return '忙碌';
    case 'offline':
      return '离线';
    default:
      return '';
  }
}

/** 获取状态颜色 */
function getStatusColor(status?: UserStatus): string {
  switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'away':
      return 'bg-yellow-500';
    case 'busy':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

/** 获取用户名首字母 */
function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

/**
 * ChatHeader 聊天头部组件
 */
const ChatHeader: FC<ChatHeaderProps> = memo(
  ({
    name,
    avatar,
    isGroup = false,
    status,
    memberCount,
    subtitle,
    onBack,
    onVoiceCall,
    onVideoCall,
    onMoreClick,
    onHeaderClick,
    showBack = false,
    className,
  }) => {
    // 构建副标题内容
    const getSubtitleContent = () => {
      if (subtitle) {
        return subtitle;
      }
      if (isGroup && memberCount) {
        return `${memberCount} 位成员`;
      }
      if (!isGroup && status) {
        return getStatusText(status);
      }
      return null;
    };

    const subtitleContent = getSubtitleContent();

    return (
      <header
        className={cn(
          'h-14 flex items-center gap-3 px-4 border-b bg-background shrink-0',
          className
        )}
      >
        {/* 返回按钮 */}
        {showBack && onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        {/* 头像和信息区 */}
        <button
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors"
          onClick={onHeaderClick}
        >
          {/* 头像 */}
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarImage src={avatar || undefined} alt={name} />
              <AvatarFallback className="text-sm">
                {isGroup ? <Users className="h-4 w-4" /> : getInitials(name)}
              </AvatarFallback>
            </Avatar>
            {/* 在线状态指示器（仅私聊） */}
            {!isGroup && status && status !== 'invisible' && (
              <span
                className={cn(
                  'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background',
                  getStatusColor(status)
                )}
              />
            )}
          </div>

          {/* 名称和状态 */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{name}</h3>
            {subtitleContent && (
              <p className="text-xs text-muted-foreground truncate">{subtitleContent}</p>
            )}
          </div>
        </button>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1">
          {/* 语音通话 */}
          {onVoiceCall && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onVoiceCall}>
              <Phone className="h-4 w-4" />
            </Button>
          )}

          {/* 视频通话 */}
          {onVideoCall && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onVideoCall}>
              <Video className="h-4 w-4" />
            </Button>
          )}

          {/* 更多选项 */}
          {onMoreClick && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMoreClick}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>
    );
  }
);

ChatHeader.displayName = 'ChatHeader';

export { ChatHeader };

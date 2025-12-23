/**
 * MessageBubble 组件
 * 展示单条消息气泡
 */

import { memo, type FC } from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { cn, Avatar, AvatarFallback, AvatarImage } from '@qyra/ui-web';
import type { Message, MessageStatus } from '@qyra/shared';

export interface MessageBubbleProps {
  /** 消息数据 */
  message: Message;
  /** 是否为自己发送的消息 */
  isOwn: boolean;
  /** 是否显示头像 */
  showAvatar?: boolean;
  /** 是否显示时间戳 */
  showTimestamp?: boolean;
  /** 是否显示发送者名称（群聊中） */
  showSenderName?: boolean;
  /** 消息气泡点击回调 */
  onBubbleClick?: (message: Message) => void;
  /** 头像点击回调 */
  onAvatarClick?: (senderId: string) => void;
  /** 重试发送回调 */
  onRetry?: () => void;
}

/** 消息状态图标 */
const StatusIcon: FC<{ status: MessageStatus; className?: string }> = ({ status, className }) => {
  const iconClass = cn('w-3.5 h-3.5', className);

  switch (status) {
    case 'pending':
      return <Clock className={cn(iconClass, 'text-muted-foreground animate-pulse')} />;
    case 'sent':
      return <Check className={cn(iconClass, 'text-muted-foreground')} />;
    case 'delivered':
      return <CheckCheck className={cn(iconClass, 'text-muted-foreground')} />;
    case 'read':
      return <CheckCheck className={cn(iconClass, 'text-blue-500')} />;
    case 'failed':
      return <AlertCircle className={cn(iconClass, 'text-destructive')} />;
    default:
      return null;
  }
};

/** 格式化时间显示 */
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // 小于 1 分钟
  if (diff < 60 * 1000) {
    return '刚刚';
  }

  // 小于 1 小时
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes}分钟前`;
  }

  // 小于 24 小时
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}小时前`;
  }

  // 超过 24 小时
  const dateObj = new Date(date);
  const isThisYear = dateObj.getFullYear() === now.getFullYear();

  if (isThisYear) {
    return `${dateObj.getMonth() + 1}月${dateObj.getDate()}日 ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
  }

  return `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
}

/** 获取用户名首字母 */
function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

/**
 * MessageBubble 消息气泡组件
 */
const MessageBubble: FC<MessageBubbleProps> = memo(
  ({
    message,
    isOwn,
    showAvatar = true,
    showTimestamp = true,
    showSenderName = false,
    onBubbleClick,
    onAvatarClick,
    onRetry,
  }) => {
    const { sender, content, type, status, isEdited, isDeleted, createdAt } = message;

    // 处理已删除/撤回的消息
    if (isDeleted) {
      return (
        <div
          className={cn('flex items-center gap-2 py-1', isOwn ? 'flex-row-reverse' : 'flex-row')}
        >
          <div className="text-muted-foreground text-sm italic">[消息已撤回]</div>
        </div>
      );
    }

    // 渲染消息内容
    const renderContent = () => {
      switch (type) {
        case 'TEXT':
          return <p className="whitespace-pre-wrap break-all text-sm leading-relaxed">{content}</p>;

        case 'IMAGE':
          return (
            <div className="max-w-xs">
              <img
                src={content}
                alt="图片消息"
                className="rounded-md max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onBubbleClick?.(message)}
              />
            </div>
          );

        case 'FILE':
          return (
            <div className="flex items-center gap-2 p-2 bg-background/50 rounded-md">
              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">📄</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{content}</p>
                <p className="text-xs text-muted-foreground">文件</p>
              </div>
            </div>
          );

        case 'VOICE':
          return (
            <div className="flex items-center gap-2 min-w-30">
              <button className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center hover:bg-background/70 transition-colors">
                ▶️
              </button>
              <div className="flex-1 h-1 bg-background/50 rounded-full">
                <div className="w-0 h-full bg-foreground/50 rounded-full" />
              </div>
            </div>
          );

        case 'SYSTEM':
          return <div className="text-center text-muted-foreground text-xs py-2">{content}</div>;

        default:
          return <p className="text-sm">{content}</p>;
      }
    };

    // 系统消息特殊处理
    if (type === 'SYSTEM') {
      return (
        <div className="flex justify-center py-2">
          <div className="text-muted-foreground text-xs bg-muted/50 px-3 py-1 rounded-full">
            {content}
          </div>
        </div>
      );
    }

    return (
      <div className={cn('flex gap-2 py-1 group', isOwn ? 'flex-row-reverse' : 'flex-row')}>
        {/* 头像 */}
        {showAvatar && (
          <button
            className="shrink-0 focus:outline-none"
            onClick={() => onAvatarClick?.(sender.id)}
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={sender.avatar || undefined} alt={sender.nickname} />
              <AvatarFallback className="text-xs">
                {getInitials(sender.nickname || sender.username)}
              </AvatarFallback>
            </Avatar>
          </button>
        )}

        {/* 消息内容区 */}
        <div className={cn('flex flex-col max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
          {/* 发送者名称 */}
          {showSenderName && !isOwn && (
            <span className="text-xs text-muted-foreground mb-1 px-1">
              {sender.nickname || sender.username}
            </span>
          )}

          {/* 气泡 */}
          <div
            className={cn(
              'relative px-3 py-2 rounded-2xl cursor-pointer transition-colors',
              isOwn ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm',
              status === 'failed' && 'opacity-70'
            )}
            onClick={() => onBubbleClick?.(message)}
          >
            {renderContent()}

            {/* 已编辑标记 */}
            {isEdited && <span className="text-[10px] opacity-60 ml-1">(已编辑)</span>}
          </div>

          {/* 底部信息：时间戳 + 状态 */}
          <div
            className={cn(
              'flex items-center gap-1 mt-0.5 px-1',
              isOwn ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            {/* 时间戳 */}
            {showTimestamp && (
              <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                {formatTime(new Date(createdAt))}
              </span>
            )}

            {/* 发送状态（仅自己的消息显示） */}
            {isOwn && <StatusIcon status={status} />}

            {/* 发送失败时的重试按钮 */}
            {isOwn && status === 'failed' && onRetry && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry();
                }}
                className="text-xs text-destructive hover:text-destructive/80 transition-colors ml-1"
              >
                重试
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

MessageBubble.displayName = 'MessageBubble';

export { MessageBubble };

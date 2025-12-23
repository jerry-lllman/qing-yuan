/**
 * MessageList 组件
 * 消息列表容器，支持滚动加载和自动滚动到底部
 */

import { useRef, useEffect, useCallback, type FC, type UIEvent, type ReactNode } from 'react';
import { cn } from '@qyra/ui-web';
import { Loader2 } from 'lucide-react';
import type { Message } from '@qyra/shared';
import { MessageBubble } from './MessageBubble';

export interface MessageListProps {
  /** 消息列表 */
  messages: Message[];
  /** 当前用户 ID */
  currentUserId: string;
  /** 是否为群聊（影响是否显示发送者名称） */
  isGroup?: boolean;
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 是否正在加载更多 */
  isLoadingMore?: boolean;
  /** 是否有更多消息 */
  hasMore?: boolean;
  /** 加载更多回调 */
  onLoadMore?: () => void;
  /** 消息点击回调 */
  onMessageClick?: (message: Message) => void;
  /** 头像点击回调 */
  onAvatarClick?: (senderId: string) => void;
  /** 重试发送回调 */
  onRetry?: (messageId: string) => void;
  /** 空状态提示 */
  emptyText?: string;
  /** 自定义类名 */
  className?: string;
  /** 头部插槽（如输入状态提示） */
  header?: ReactNode;
  /** 底部插槽 */
  footer?: ReactNode;
}

/** 滚动阈值（px），小于此距离认为在底部 */
const SCROLL_THRESHOLD = 100;
/** 加载更多阈值（px），滚动到顶部此距离内触发加载 */
const LOAD_MORE_THRESHOLD = 200;

/**
 * MessageList 消息列表组件
 */
const MessageList: FC<MessageListProps> = ({
  messages,
  currentUserId,
  isGroup = false,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  onMessageClick,
  onAvatarClick,
  onRetry,
  emptyText = '暂无消息，发送第一条消息开始聊天吧',
  className,
  header,
  footer,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(messages.length);

  // 滚动到底部
  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  // 检查是否在底部
  const checkIsAtBottom = useCallback(() => {
    if (!scrollRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
  }, []);

  // 处理滚动事件
  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      isAtBottomRef.current = checkIsAtBottom();

      // 检测是否滚动到顶部，触发加载更多
      if (target.scrollTop < LOAD_MORE_THRESHOLD && hasMore && !isLoadingMore && onLoadMore) {
        onLoadMore();
      }
    },
    [hasMore, isLoadingMore, onLoadMore, checkIsAtBottom]
  );

  // 新消息时自动滚动到底部
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      // 有新消息
      if (isAtBottomRef.current) {
        // 如果之前在底部，自动滚动
        scrollToBottom();
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // 初次加载时滚动到底部
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      scrollToBottom(false);
    }
  }, [isLoading, scrollToBottom, messages.length]);

  // 判断是否需要显示头像（连续同一发送者不显示）
  const shouldShowAvatar = (index: number): boolean => {
    if (index === 0) return true;
    const currentMsg = messages[index];
    const prevMsg = messages[index - 1];
    // 不同发送者或时间间隔超过 5 分钟
    if (currentMsg.senderId !== prevMsg.senderId) return true;
    const timeDiff =
      new Date(currentMsg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
    return timeDiff > 5 * 60 * 1000;
  };

  // 判断是否需要显示时间分隔线
  const shouldShowTimeSeparator = (index: number): boolean => {
    if (index === 0) return true;
    const currentMsg = messages[index];
    const prevMsg = messages[index - 1];
    const timeDiff =
      new Date(currentMsg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
    // 时间间隔超过 10 分钟显示分隔线
    return timeDiff > 10 * 60 * 1000;
  };

  // 格式化日期分隔线文本
  const formatDateSeparator = (date: Date): string => {
    const now = new Date();
    const msgDate = new Date(date);
    const isToday = msgDate.toDateString() === now.toDateString();
    const isYesterday =
      new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString() === msgDate.toDateString();

    if (isToday) {
      return `今天 ${msgDate.getHours().toString().padStart(2, '0')}:${msgDate.getMinutes().toString().padStart(2, '0')}`;
    }
    if (isYesterday) {
      return `昨天 ${msgDate.getHours().toString().padStart(2, '0')}:${msgDate.getMinutes().toString().padStart(2, '0')}`;
    }

    const isThisYear = msgDate.getFullYear() === now.getFullYear();
    if (isThisYear) {
      return `${msgDate.getMonth() + 1}月${msgDate.getDate()}日 ${msgDate.getHours().toString().padStart(2, '0')}:${msgDate.getMinutes().toString().padStart(2, '0')}`;
    }

    return `${msgDate.getFullYear()}年${msgDate.getMonth() + 1}月${msgDate.getDate()}日`;
  };

  // 渲染加载状态
  if (isLoading) {
    return (
      <div className={cn('flex-1 flex items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">加载消息中...</span>
        </div>
      </div>
    );
  }

  // 渲染空状态
  if (messages.length === 0) {
    return (
      <div className={cn('flex-1 flex items-center justify-center', className)}>
        <p className="text-muted-foreground text-sm">{emptyText}</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={cn('flex-1 overflow-y-auto', className)}
      onScroll={handleScroll}
    >
      <div className="px-4 py-2">
        {/* 加载更多指示器 */}
        {hasMore && (
          <div className="flex justify-center py-2">
            {isLoadingMore ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>加载中...</span>
              </div>
            ) : (
              <button
                onClick={onLoadMore}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                加载更多
              </button>
            )}
          </div>
        )}

        {/* 头部插槽 */}
        {header}

        {/* 消息列表 */}
        {messages.map((message, index) => (
          <div key={message.id}>
            {/* 时间分隔线 */}
            {shouldShowTimeSeparator(index) && (
              <div className="flex justify-center py-3">
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                  {formatDateSeparator(new Date(message.createdAt))}
                </span>
              </div>
            )}

            {/* 消息气泡 */}
            <MessageBubble
              message={message}
              isOwn={message.senderId === currentUserId}
              showAvatar={shouldShowAvatar(index)}
              showSenderName={isGroup && message.senderId !== currentUserId}
              showTimestamp={true}
              onBubbleClick={onMessageClick}
              onAvatarClick={onAvatarClick}
              onRetry={onRetry ? () => onRetry(message.id) : undefined}
            />
          </div>
        ))}

        {/* 底部插槽 */}
        {footer}
      </div>
    </div>
  );
};

export { MessageList };

/**
 * MessageInput 组件
 * 消息输入框，支持文本输入、发送、附件等
 */

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type FC,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';
import { cn, Textarea, Button } from '@qyra/ui-web';
import { Send, Paperclip, Smile, Image as ImageIcon } from 'lucide-react';
import type { MessageType } from '@qyra/shared';

export interface MessageInputProps {
  /** 初始值 */
  defaultValue?: string;
  /** 占位文本 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否正在发送 */
  isSending?: boolean;
  /** 最大字符数 */
  maxLength?: number;
  /** 发送消息回调 */
  onSend: (data: { type: MessageType; content: string }) => void;
  /** 输入变化回调（用于保存草稿） */
  onChange?: (content: string) => void;
  /** 开始输入回调（用于发送输入状态） */
  onTypingStart?: () => void;
  /** 停止输入回调 */
  onTypingStop?: () => void;
  /** 附件上传回调 */
  onAttachmentUpload?: (files: File[]) => void;
  /** 自定义类名 */
  className?: string;
}

/** 输入状态防抖时间（ms） */
const TYPING_DEBOUNCE = 1000;

/**
 * MessageInput 消息输入组件
 */
const MessageInput: FC<MessageInputProps> = ({
  defaultValue = '',
  placeholder = '输入消息...',
  disabled = false,
  isSending = false,
  maxLength = 10000,
  onSend,
  onChange,
  onTypingStart,
  onTypingStop,
  onAttachmentUpload,
  className,
}) => {
  const [content, setContent] = useState(defaultValue);
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 同步外部 defaultValue 变化
  useEffect(() => {
    setContent(defaultValue);
  }, [defaultValue]);

  // 清理 typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // 自动调整高度
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120); // 最大 120px
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  // 处理输入变化
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= maxLength) {
        setContent(value);
        onChange?.(value);
        adjustHeight();

        // 处理输入状态
        if (value.length > 0) {
          if (!isTypingRef.current) {
            isTypingRef.current = true;
            onTypingStart?.();
          }

          // 重置 typing timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
            onTypingStop?.();
          }, TYPING_DEBOUNCE);
        }
      }
    },
    [maxLength, onChange, onTypingStart, onTypingStop, adjustHeight]
  );

  // 发送消息
  const handleSend = useCallback(() => {
    const trimmedContent = content.trim();
    if (!trimmedContent || disabled || isSending) return;

    onSend({ type: 'TEXT', content: trimmedContent });
    setContent('');

    // 重置高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // 停止输入状态
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingStop?.();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }

    // 聚焦输入框
    textareaRef.current?.focus();
  }, [content, disabled, isSending, onSend, onTypingStop]);

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter 发送，Shift+Enter 换行
      if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, isComposing]
  );

  // 处理中文输入法
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0 && onAttachmentUpload) {
        onAttachmentUpload(files);
      }
      // 重置 input，允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onAttachmentUpload]
  );

  // 打开文件选择器
  const handleAttachmentClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const canSend = content.trim().length > 0 && !disabled && !isSending;

  return (
    <div className={cn('flex flex-col gap-2 p-3 bg-background border-t', className)}>
      {/* 工具栏 */}
      <div className="flex items-center gap-1">
        {/* 附件按钮 */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleAttachmentClick}
          disabled={disabled}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* 图片按钮 */}
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={disabled}>
          <ImageIcon className="h-4 w-4" />
        </Button>

        {/* 表情按钮 */}
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={disabled}>
          <Smile className="h-4 w-4" />
        </Button>

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
        />
      </div>

      {/* 输入区域 */}
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'flex-1 min-h-10 max-h-30 resize-none py-2 px-3',
            'scrollbar-thin scrollbar-thumb-muted'
          )}
          rows={1}
        />

        {/* 发送按钮 */}
        <Button
          type="button"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={handleSend}
          disabled={!canSend}
        >
          <Send className={cn('h-4 w-4', isSending && 'animate-pulse')} />
        </Button>
      </div>

      {/* 字符计数（接近限制时显示） */}
      {content.length > maxLength * 0.8 && (
        <div className="flex justify-end">
          <span
            className={cn(
              'text-xs',
              content.length >= maxLength ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {content.length}/{maxLength}
          </span>
        </div>
      )}
    </div>
  );
};

export { MessageInput };

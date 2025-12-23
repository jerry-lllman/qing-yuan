/**
 * 消息相关类型定义
 */

import { type UserBrief } from './user.js';

/** 消息类型 */
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE' | 'VIDEO' | 'SYSTEM';

/** 消息状态 */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

/** 消息附件 */
export interface MessageAttachment {
  id: string;
  type: string;
  url: string;
  name: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number; // 语音/视频时长（秒）
  thumbnail?: string;
}

/** 消息 */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: UserBrief;
  type: MessageType;
  content: string;
  attachments: MessageAttachment[];
  replyTo: string | null;
  replyToMessage?: Message | null;
  status: MessageStatus;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** 发送消息请求 */
export interface SendMessageRequest {
  conversationId: string;
  type: MessageType;
  content: string;
  attachments?: Omit<MessageAttachment, 'id'>[];
  replyTo?: string;
}

/** 消息已读回执 */
export interface MessageReadReceipt {
  messageId: string;
  userId: string;
  readAt: Date;
}

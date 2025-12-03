/**
 * 消息相关 Zod Schema
 */

import { z } from 'zod';
import { Limits } from '@qing-yuan/shared';

/** 消息类型 */
export const messageTypeSchema = z.enum(['text', 'image', 'file', 'voice', 'video', 'system']);

/** 附件 Schema */
export const attachmentSchema = z.object({
  type: z.string(),
  url: z.string().url('无效的 URL'),
  name: z.string().min(1, '文件名不能为空'),
  size: z.number().positive('文件大小必须大于 0'),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  duration: z.number().positive().optional(),
  thumbnail: z.string().url().optional(),
});

/** 发送消息 Schema */
export const sendMessageSchema = z.object({
  conversationId: z.string().uuid('无效的会话 ID'),
  type: messageTypeSchema,
  content: z
    .string()
    .min(1, '消息内容不能为空')
    .max(Limits.MESSAGE_MAX_LENGTH, `消息内容最多 ${Limits.MESSAGE_MAX_LENGTH} 个字符`),
  attachments: z
    .array(attachmentSchema)
    .max(Limits.ATTACHMENTS_MAX_COUNT, `最多上传 ${Limits.ATTACHMENTS_MAX_COUNT} 个附件`)
    .optional(),
  replyTo: z.string().uuid('无效的回复消息 ID').optional(),
  clientMessageId: z.string().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/** 编辑消息 Schema */
export const editMessageSchema = z.object({
  messageId: z.string().uuid('无效的消息 ID'),
  content: z
    .string()
    .min(1, '消息内容不能为空')
    .max(Limits.MESSAGE_MAX_LENGTH, `消息内容最多 ${Limits.MESSAGE_MAX_LENGTH} 个字符`),
});

export type EditMessageInput = z.infer<typeof editMessageSchema>;

/** 删除消息 Schema */
export const deleteMessageSchema = z.object({
  messageId: z.string().uuid('无效的消息 ID'),
});

export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;

/** 已读消息 Schema */
export const readMessageSchema = z.object({
  conversationId: z.string().uuid('无效的会话 ID'),
  messageId: z.string().uuid('无效的消息 ID'),
});

export type ReadMessageInput = z.infer<typeof readMessageSchema>;

/** 正在输入 Schema */
export const typingSchema = z.object({
  conversationId: z.string().uuid('无效的会话 ID'),
});

export type TypingInput = z.infer<typeof typingSchema>;

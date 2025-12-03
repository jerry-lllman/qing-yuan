import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty({ message: '会话 ID 不能为空' })
  conversationId: string;

  @IsEnum(['TEXT', 'IMAGE', 'FILE', 'VOICE', 'VIDEO'], {
    message: '无效的消息类型',
  })
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE' | 'VIDEO';

  @IsString()
  @IsNotEmpty({ message: '消息内容不能为空' })
  @MaxLength(10000, { message: '消息内容最多 10000 个字符' })
  content: string;

  @IsOptional()
  @IsString()
  replyToId?: string;

  @IsOptional()
  @IsString()
  clientMessageId?: string; // 客户端生成的临时 ID，用于消息去重
}

import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendFriendRequestDto {
  @IsString()
  @IsNotEmpty({ message: '接收者 ID 不能为空' })
  receiverId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '验证消息最多 100 个字符' })
  message?: string;
}

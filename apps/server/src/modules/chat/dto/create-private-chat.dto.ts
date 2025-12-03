import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePrivateChatDto {
  @IsString()
  @IsNotEmpty({ message: '对方用户 ID 不能为空' })
  targetUserId: string;
}

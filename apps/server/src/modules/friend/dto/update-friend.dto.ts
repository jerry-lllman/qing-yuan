import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFriendDto {
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: '备注最多 30 个字符' })
  remark?: string;
}

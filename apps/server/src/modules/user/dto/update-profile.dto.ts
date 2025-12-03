import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: '昵称至少 1 个字符' })
  @MaxLength(30, { message: '昵称最多 30 个字符' })
  nickname?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '个人简介最多 200 个字符' })
  bio?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty({ message: '群名称不能为空' })
  @MinLength(1, { message: '群名称至少 1 个字符' })
  @MaxLength(50, { message: '群名称最多 50 个字符' })
  name: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsArray()
  @IsString({ each: true })
  memberIds: string[];
}

import { IsArray, IsNotEmpty, IsString, ArrayMinSize } from 'class-validator';

/**
 * 添加群成员 DTO
 */
export class AddMembersDto {
  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1, { message: '至少添加一个成员' })
  @IsString({ each: true, message: '无效的用户 ID' })
  userIds: string[];
}

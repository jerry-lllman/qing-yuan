import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * 成员角色类型
 */
export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

/**
 * 更新群成员信息 DTO
 */
export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @IsOptional()
  @IsString()
  @IsIn(['OWNER', 'ADMIN', 'MEMBER'], { message: '无效的角色' })
  role?: MemberRole;
}

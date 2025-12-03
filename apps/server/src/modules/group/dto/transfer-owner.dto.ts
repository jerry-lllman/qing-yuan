import { IsNotEmpty, IsString } from 'class-validator';

/**
 * 转让群主 DTO
 */
export class TransferOwnerDto {
  @IsNotEmpty({ message: '新群主 ID 不能为空' })
  @IsString({ message: '无效的用户 ID' })
  newOwnerId: string;
}

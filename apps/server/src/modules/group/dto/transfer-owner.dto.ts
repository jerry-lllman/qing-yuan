import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * 转让群主 DTO
 */
export class TransferOwnerDto {
  @IsNotEmpty({ message: '新群主 ID 不能为空' })
  @IsUUID('4', { message: '无效的用户 ID' })
  newOwnerId: string;
}

import {
  IsInt,
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 一次性预密钥 DTO
 */
export class PreKeyDto {
  @IsInt()
  @Min(0)
  keyId: number;

  @IsString()
  publicKey: string;
}

/**
 * 上传密钥包 DTO
 */
export class UploadKeysDto {
  @IsInt()
  @Min(1)
  registrationId: number;

  @IsString()
  identityKey: string;

  @IsInt()
  @Min(0)
  signedPreKeyId: number;

  @IsString()
  signedPreKey: string;

  @IsString()
  signedPreKeySignature: string;

  @IsInt()
  @Min(0)
  kyberPreKeyId: number;

  @IsString()
  kyberPreKey: string;

  @IsString()
  kyberPreKeySignature: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreKeyDto)
  @ArrayMinSize(0)
  preKeys?: PreKeyDto[];
}

/**
 * 补充预密钥 DTO
 */
export class ReplenishPreKeysDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreKeyDto)
  @ArrayMinSize(1)
  preKeys: PreKeyDto[];
}

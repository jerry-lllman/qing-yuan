/**
 * PreKey Bundle 响应 DTO
 */
export class PreKeyBundleResponseDto {
  userId: string;
  registrationId: number;
  identityKey: string;
  signedPreKeyId: number;
  signedPreKey: string;
  signedPreKeySignature: string;
  kyberPreKeyId: number;
  kyberPreKey: string;
  kyberPreKeySignature: string;
  preKeyId?: number;
  preKey?: string;
}

/**
 * 密钥状态响应 DTO
 */
export class KeyStatusResponseDto {
  hasKeys: boolean;
  preKeyCount: number;
  signedPreKeyUpdatedAt?: Date;
}

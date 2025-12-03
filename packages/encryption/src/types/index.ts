/**
 * 加密模块类型定义
 */

/**
 * 设备 ID（用于多设备支持）
 */
export type DeviceId = number;

/**
 * 注册 ID（Signal Protocol 要求的随机 ID）
 */
export type RegistrationId = number;

/**
 * 身份密钥对（长期密钥）
 */
export interface IdentityKeyPair {
  /** 公钥（Base64 编码） */
  publicKey: string;
  /** 私钥（Base64 编码） */
  privateKey: string;
}

/**
 * 预密钥（一次性密钥）
 */
export interface PreKey {
  /** 预密钥 ID */
  keyId: number;
  /** 公钥（Base64 编码） */
  publicKey: string;
  /** 私钥（Base64 编码） */
  privateKey: string;
}

/**
 * 签名预密钥（中期密钥，需要定期轮换）
 */
export interface SignedPreKey {
  /** 签名预密钥 ID */
  keyId: number;
  /** 公钥（Base64 编码） */
  publicKey: string;
  /** 私钥（Base64 编码） */
  privateKey: string;
  /** 签名（Base64 编码） */
  signature: string;
  /** 创建时间戳 */
  timestamp: number;
}

/**
 * 密钥包（用于密钥交换，发送给服务器）
 */
export interface PreKeyBundle {
  /** 用户 ID */
  userId: string;
  /** 设备 ID */
  deviceId: DeviceId;
  /** 注册 ID */
  registrationId: RegistrationId;
  /** 身份公钥（Base64 编码） */
  identityKey: string;
  /** 签名预密钥 ID */
  signedPreKeyId: number;
  /** 签名预密钥公钥（Base64 编码） */
  signedPreKey: string;
  /** 签名预密钥签名（Base64 编码） */
  signedPreKeySignature: string;
  /** 一次性预密钥 ID（可选） */
  preKeyId?: number;
  /** 一次性预密钥公钥（Base64 编码，可选） */
  preKey?: string;
}

/**
 * 加密后的消息
 */
export interface EncryptedMessage {
  /** 消息类型：3 = PreKey 消息（首次通信），2 = 普通消息 */
  type: number;
  /** 发送者设备 ID */
  deviceId: DeviceId;
  /** 发送者注册 ID */
  registrationId: RegistrationId;
  /** 加密后的内容（Base64 编码） */
  content: string;
}

/**
 * 会话信息
 */
export interface SessionInfo {
  /** 远程用户 ID */
  remoteUserId: string;
  /** 远程设备 ID */
  remoteDeviceId: DeviceId;
  /** 会话是否已建立 */
  hasSession: boolean;
  /** 会话版本 */
  sessionVersion?: number;
}

/**
 * 密钥存储接口（需要由使用方实现）
 */
export interface KeyStore {
  // Identity Key 存储
  getIdentityKeyPair(): Promise<IdentityKeyPair | null>;
  saveIdentityKeyPair(keyPair: IdentityKeyPair): Promise<void>;

  // Registration ID 存储
  getRegistrationId(): Promise<RegistrationId | null>;
  saveRegistrationId(id: RegistrationId): Promise<void>;

  // Pre-Key 存储
  getPreKey(keyId: number): Promise<PreKey | null>;
  savePreKey(preKey: PreKey): Promise<void>;
  removePreKey(keyId: number): Promise<void>;
  getAllPreKeyIds(): Promise<number[]>;

  // Signed Pre-Key 存储
  getSignedPreKey(keyId: number): Promise<SignedPreKey | null>;
  saveSignedPreKey(signedPreKey: SignedPreKey): Promise<void>;
  removeSignedPreKey(keyId: number): Promise<void>;
  getLatestSignedPreKeyId(): Promise<number | null>;

  // 远程身份密钥存储（用于验证对方身份）
  getRemoteIdentityKey(userId: string, deviceId: DeviceId): Promise<string | null>;
  saveRemoteIdentityKey(userId: string, deviceId: DeviceId, identityKey: string): Promise<void>;
  isTrustedIdentity(userId: string, deviceId: DeviceId, identityKey: string): Promise<boolean>;

  // 会话存储
  getSession(userId: string, deviceId: DeviceId): Promise<Uint8Array | null>;
  saveSession(userId: string, deviceId: DeviceId, session: Uint8Array): Promise<void>;
  removeSession(userId: string, deviceId: DeviceId): Promise<void>;
  removeAllSessions(userId: string): Promise<void>;
}

/**
 * 密钥生成选项
 */
export interface KeyGenerationOptions {
  /** 生成的预密钥数量（默认 100） */
  preKeyCount?: number;
  /** 预密钥起始 ID（默认 1） */
  preKeyStartId?: number;
  /** 签名预密钥 ID（默认 1） */
  signedPreKeyId?: number;
}

/**
 * 生成的完整密钥集合
 */
export interface GeneratedKeys {
  /** 身份密钥对 */
  identityKeyPair: IdentityKeyPair;
  /** 注册 ID */
  registrationId: RegistrationId;
  /** 预密钥列表 */
  preKeys: PreKey[];
  /** 签名预密钥 */
  signedPreKey: SignedPreKey;
}

/**
 * 密钥生成与管理模块
 *
 * 使用 Signal Protocol 的 libsignal-client 库实现：
 * - Identity Key：长期身份密钥对（用于身份验证）
 * - Signed Pre-Key：中期密钥（需定期轮换，默认 7 天）
 * - Pre-Keys：一次性预密钥（用于建立会话）
 */

import * as signal from '@signalapp/libsignal-client';
import type {
  IdentityKeyPair,
  PreKey,
  SignedPreKey,
  RegistrationId,
  GeneratedKeys,
  KeyGenerationOptions,
  PreKeyBundle,
  DeviceId,
} from '../types';

/**
 * 默认配置
 */
const DEFAULT_PRE_KEY_COUNT = 100;
const DEFAULT_PRE_KEY_START_ID = 1;
const DEFAULT_SIGNED_PRE_KEY_ID = 1;

/**
 * 将 Uint8Array 转换为 Base64 字符串
 */
export function toBase64(data: Uint8Array): string {
  return Buffer.from(data).toString('base64');
}

/**
 * 将 Base64 字符串转换为 Uint8Array
 */
export function fromBase64(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/**
 * 生成随机的 Registration ID
 * Registration ID 是一个 1-16380 之间的随机数
 */
export function generateRegistrationId(): RegistrationId {
  // 生成 1 到 16380 之间的随机数
  const array = new Uint8Array(2);
  crypto.getRandomValues(array);
  const value = ((array[0]! << 8) | array[1]!) % 16380;
  return (value + 1) as RegistrationId;
}

/**
 * 生成身份密钥对（Identity Key Pair）
 * 这是长期密钥，用于身份验证，应安全存储
 */
export function generateIdentityKeyPair(): IdentityKeyPair {
  const keyPair = signal.PrivateKey.generate();
  const publicKey = keyPair.getPublicKey();

  return {
    publicKey: toBase64(publicKey.serialize()),
    privateKey: toBase64(keyPair.serialize()),
  };
}

/**
 * 生成预密钥（Pre-Keys）
 * 这些是一次性密钥，用于建立会话
 *
 * @param count 生成的预密钥数量
 * @param startId 起始 ID
 */
export function generatePreKeys(count: number, startId: number = 1): PreKey[] {
  const preKeys: PreKey[] = [];

  for (let i = 0; i < count; i++) {
    const keyId = startId + i;
    const keyPair = signal.PrivateKey.generate();
    const publicKey = keyPair.getPublicKey();

    preKeys.push({
      keyId,
      publicKey: toBase64(publicKey.serialize()),
      privateKey: toBase64(keyPair.serialize()),
    });
  }

  return preKeys;
}

/**
 * 生成签名预密钥（Signed Pre-Key）
 * 这是中期密钥，需要用身份私钥签名，建议每 7 天轮换一次
 *
 * @param identityPrivateKey 身份私钥（Base64 编码）
 * @param keyId 签名预密钥 ID
 */
export function generateSignedPreKey(identityPrivateKey: string, keyId: number = 1): SignedPreKey {
  // 解析身份私钥
  const identityKey = signal.PrivateKey.deserialize(fromBase64(identityPrivateKey));

  // 生成签名预密钥对
  const keyPair = signal.PrivateKey.generate();
  const publicKey = keyPair.getPublicKey();
  const publicKeyBytes = publicKey.serialize();

  // 使用身份私钥对公钥进行签名
  const signature = identityKey.sign(publicKeyBytes);

  return {
    keyId,
    publicKey: toBase64(publicKeyBytes),
    privateKey: toBase64(keyPair.serialize()),
    signature: toBase64(signature),
    timestamp: Date.now(),
  };
}

/**
 * 验证签名预密钥的签名
 *
 * @param identityPublicKey 身份公钥（Base64 编码）
 * @param signedPreKey 签名预密钥
 */
export function verifySignedPreKey(identityPublicKey: string, signedPreKey: SignedPreKey): boolean {
  try {
    const identityKey = signal.PublicKey.deserialize(fromBase64(identityPublicKey));
    const publicKeyBytes = fromBase64(signedPreKey.publicKey);
    const signatureBytes = fromBase64(signedPreKey.signature);

    return identityKey.verify(publicKeyBytes, signatureBytes);
  } catch {
    return false;
  }
}

/**
 * 生成完整的密钥集合
 * 包括身份密钥、注册 ID、预密钥和签名预密钥
 *
 * @param options 密钥生成选项
 */
export function generateKeys(options: KeyGenerationOptions = {}): GeneratedKeys {
  const {
    preKeyCount = DEFAULT_PRE_KEY_COUNT,
    preKeyStartId = DEFAULT_PRE_KEY_START_ID,
    signedPreKeyId = DEFAULT_SIGNED_PRE_KEY_ID,
  } = options;

  // 1. 生成身份密钥对
  const identityKeyPair = generateIdentityKeyPair();

  // 2. 生成注册 ID
  const registrationId = generateRegistrationId();

  // 3. 生成预密钥
  const preKeys = generatePreKeys(preKeyCount, preKeyStartId);

  // 4. 生成签名预密钥
  const signedPreKey = generateSignedPreKey(identityKeyPair.privateKey, signedPreKeyId);

  return {
    identityKeyPair,
    registrationId,
    preKeys,
    signedPreKey,
  };
}

/**
 * 创建预密钥包（用于上传到服务器）
 *
 * @param userId 用户 ID
 * @param deviceId 设备 ID
 * @param keys 生成的密钥集合
 * @param preKeyIndex 使用的预密钥索引（可选，不提供则不包含一次性预密钥）
 */
export function createPreKeyBundle(
  userId: string,
  deviceId: DeviceId,
  keys: GeneratedKeys,
  preKeyIndex?: number
): PreKeyBundle {
  const bundle: PreKeyBundle = {
    userId,
    deviceId,
    registrationId: keys.registrationId,
    identityKey: keys.identityKeyPair.publicKey,
    signedPreKeyId: keys.signedPreKey.keyId,
    signedPreKey: keys.signedPreKey.publicKey,
    signedPreKeySignature: keys.signedPreKey.signature,
  };

  // 如果提供了预密钥索引，添加一次性预密钥
  if (preKeyIndex !== undefined && keys.preKeys[preKeyIndex]) {
    const preKey = keys.preKeys[preKeyIndex];
    bundle.preKeyId = preKey.keyId;
    bundle.preKey = preKey.publicKey;
  }

  return bundle;
}

/**
 * 检查签名预密钥是否需要轮换
 *
 * @param signedPreKey 签名预密钥
 * @param maxAgeMs 最大有效期（毫秒，默认 7 天）
 */
export function shouldRotateSignedPreKey(
  signedPreKey: SignedPreKey,
  maxAgeMs: number = 7 * 24 * 60 * 60 * 1000
): boolean {
  const age = Date.now() - signedPreKey.timestamp;
  return age > maxAgeMs;
}

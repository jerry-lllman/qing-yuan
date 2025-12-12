/**
 * Signal Protocol 存储适配器接口
 * 定义持久化存储需要实现的方法
 */

/**
 * Signal 存储适配器接口
 * 各平台（Web/Native/Electron）需要实现此接口
 */
export interface ISignalStorageAdapter {
  // ========================
  // Identity Key
  // ========================

  /** 获取本地身份密钥对 */
  getIdentityKeyPair(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array } | null>;

  /** 保存本地身份密钥对 */
  saveIdentityKeyPair(publicKey: Uint8Array, privateKey: Uint8Array): Promise<void>;

  /** 获取本地注册 ID */
  getLocalRegistrationId(): Promise<number | null>;

  /** 保存本地注册 ID */
  saveLocalRegistrationId(id: number): Promise<void>;

  // ========================
  // Remote Identity
  // ========================

  /** 获取远程身份公钥 */
  getRemoteIdentity(address: string): Promise<Uint8Array | null>;

  /** 保存远程身份公钥 */
  saveRemoteIdentity(address: string, identityKey: Uint8Array): Promise<void>;

  // ========================
  // Session
  // ========================

  /** 获取会话记录 */
  getSession(address: string): Promise<Uint8Array | null>;

  /** 保存会话记录 */
  saveSession(address: string, record: Uint8Array): Promise<void>;

  /** 删除会话记录 */
  removeSession(address: string): Promise<void>;

  /** 获取所有会话地址 */
  getAllSessionAddresses(): Promise<string[]>;

  // ========================
  // PreKey
  // ========================

  /** 获取预密钥 */
  getPreKey(id: number): Promise<Uint8Array | null>;

  /** 保存预密钥 */
  savePreKey(id: number, record: Uint8Array): Promise<void>;

  /** 删除预密钥 */
  removePreKey(id: number): Promise<void>;

  /** 获取所有预密钥 ID */
  getAllPreKeyIds(): Promise<number[]>;

  // ========================
  // Signed PreKey
  // ========================

  /** 获取签名预密钥 */
  getSignedPreKey(id: number): Promise<Uint8Array | null>;

  /** 保存签名预密钥 */
  saveSignedPreKey(id: number, record: Uint8Array): Promise<void>;

  /** 删除签名预密钥 */
  removeSignedPreKey(id: number): Promise<void>;

  // ========================
  // Kyber PreKey
  // ========================

  /** 获取 Kyber 预密钥 */
  getKyberPreKey(id: number): Promise<Uint8Array | null>;

  /** 保存 Kyber 预密钥 */
  saveKyberPreKey(id: number, record: Uint8Array): Promise<void>;

  /** 标记 Kyber 预密钥已使用 */
  markKyberPreKeyUsed(id: number): Promise<void>;
}

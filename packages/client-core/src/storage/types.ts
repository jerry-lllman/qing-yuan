/** 存储命名空间 */
export type StorageNamespace = 'encryption' | 'messages' | 'chats' | 'users' | 'app';

/** 存储键 */
export type StorageKey = string;

/** 存储值（必须可序列化） */
export type StorageValue = string | number | boolean | object | null;

/** 批量操作条目 */
export interface StorageEntry<T = StorageValue> {
  key: StorageKey;
  value: T;
}

/** 存储适配器配置 */
export interface StorageAdapterConfig {
  /** 存储命名空间 */
  namespace: StorageNamespace;
  /** 存储键 （用于 IndexedDB 数据库名等）*/
  name?: string;
  /** 版本号 (用于 indexedDB 升级) */
  version?: number;
}

/**
 * 基础存储适配器接口
 * 所有平台实现都必须实现此接口
 */
export interface IStorageAdapter {
  /** 命名空间 */
  readonly namespace: StorageNamespace;

  /** 初始化存储 */
  init(): Promise<void>;

  /** 关闭存储连接 */
  close(): Promise<void>;

  // ======================
  // CRUD 方法
  // ======================

  /** 检查 key 是否存在 */
  has(key: StorageKey): Promise<boolean>;

  /** 获取值 */
  get<T = StorageValue>(key: StorageKey): Promise<T | null>;

  /** 设置值 */
  set<T = StorageValue>(key: StorageKey, value: T): Promise<void>;

  /** 删除值 */
  remove(key: StorageKey): Promise<void>;

  /** 清空命名空间下的所有值 */
  clear(): Promise<void>;

  // ======================
  // 批量操作方法
  // ======================

  /** 批量获取值 */
  getMany<T = StorageValue>(keys: StorageKey[]): Promise<Map<StorageKey, T>>;

  /** 批量设置值 */
  setMany<T = StorageValue>(entries: StorageEntry<T>[]): Promise<void>;

  /** 批量删除值 */
  removeMany(keys: StorageKey[]): Promise<void>;

  // ======================
  // 二进制数据 （加密密钥专用）
  // ======================

  /** 获取二进制数据 */
  getBytes(key: StorageKey): Promise<Uint8Array | null>;

  /** 设置二进制数据 */
  setBytes(key: StorageKey, bytes: Uint8Array): Promise<void>;

  // ======================
  // 查询操作
  // ======================

  /** 获取所有匹配前缀的 keys */
  keys(prefix?: string): Promise<StorageKey[]>;

  /** 获取存储条目数量 */
  count(prefix?: string): Promise<number>;
}

/**
 * Signal Protocol 存储接口
 * 基于 IStorageAdapter 为 Signal 库提供专门的存储方法
 */
export interface ISignalStorageAdapter {
  // Identity Key
  getIdentityKeyPair(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array } | null>;
  saveIdentityKeyPair(publicKey: Uint8Array, privateKey: Uint8Array): Promise<void>;
  getLocalRegistrationId(): Promise<number | null>;
  saveLocalRegistrationId(id: number): Promise<void>;

  // Remote Identity
  getRemoteIdentity(address: string): Promise<Uint8Array | null>;
  saveRemoteIdentity(address: string, identityKey: Uint8Array): Promise<void>;

  // Session
  getSession(address: string): Promise<Uint8Array | null>;
  saveSession(address: string, record: Uint8Array): Promise<void>;
  removeSession(address: string): Promise<void>;
  getAllSessionAddresses(): Promise<string[]>;

  // PreKey
  getPreKey(id: number): Promise<Uint8Array | null>;
  savePreKey(id: number, record: Uint8Array): Promise<void>;
  removePreKey(id: number): Promise<void>;
  getAllPreKeyIds(): Promise<number[]>;

  // Signed PreKey
  getSignedPreKey(id: number): Promise<Uint8Array | null>;
  saveSignedPreKey(id: number, record: Uint8Array): Promise<void>;
  removeSignedPreKey(id: number): Promise<void>;

  // Kyber PreKey
  getKyberPreKey(id: number): Promise<Uint8Array | null>;
  saveKyberPreKey(id: number, record: Uint8Array): Promise<void>;
  markKyberPreKeyUsed(id: number): Promise<void>;
}

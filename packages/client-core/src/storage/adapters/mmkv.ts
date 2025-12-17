/**
 * MMKV 存储适配器
 * 用于 React Native 平台的高性能持久化存储
 *
 * 注意：此适配器依赖 react-native-mmkv，仅在 React Native 环境中可用
 * 安装：pnpm add react-native-mmkv --filter @qyra/mobile
 */
import { StorageAdapter } from '../adapter';
import { StorageAdapterConfig, StorageKey, StorageValue } from '../types';
import { StorageError, StorageErrorCode } from '../errors';

/**
 * MMKV 实例接口
 * 与 react-native-mmkv 的 MMKV 类保持一致
 */
export interface IMMKVInstance {
  /** 获取字符串值 */
  getString(key: string): string | undefined;
  /** 设置字符串值 */
  set(key: string, value: string | number | boolean | Uint8Array): void;
  /** 获取数字值 */
  getNumber(key: string): number | undefined;
  /** 获取布尔值 */
  getBoolean(key: string): boolean | undefined;
  /** 获取二进制数据 */
  getBuffer(key: string): Uint8Array | undefined;
  /** 删除键 */
  delete(key: string): void;
  /** 检查键是否存在 */
  contains(key: string): boolean;
  /** 获取所有键 */
  getAllKeys(): string[];
  /** 清空所有数据 */
  clearAll(): void;
}

/** MMKV 存储适配器配置 */
export interface MMKVStorageAdapterConfig extends StorageAdapterConfig {
  /**
   * MMKV 实例
   * 由外部创建并传入，以支持不同的加密模式和存储路径
   *
   * @example
   * ```typescript
   * import { MMKV } from 'react-native-mmkv';
   *
   * const mmkv = new MMKV({
   *   id: 'qyra-encryption',
   *   encryptionKey: 'your-encryption-key',
   * });
   *
   * const adapter = new MMKVStorageAdapter({
   *   namespace: 'encryption',
   *   mmkv,
   * });
   * ```
   */
  mmkv: IMMKVInstance;
}

/** 存储值类型标记 */
enum ValueType {
  STRING = 's',
  NUMBER = 'n',
  BOOLEAN = 'b',
  OBJECT = 'o',
  NULL = 'x',
}

/**
 * MMKV 存储适配器
 * 实现基于 MMKV 的高性能持久化存储
 *
 * 特点：
 * - 同步 API（内部使用 Promise 包装以符合接口）
 * - 高性能（比 AsyncStorage 快 30 倍）
 * - 支持加密存储
 * - 支持多进程访问
 */
export class MMKVStorageAdapter extends StorageAdapter {
  private mmkv: IMMKVInstance;

  constructor(config: MMKVStorageAdapterConfig) {
    super(config);
    this.mmkv = config.mmkv;
  }

  // ========================
  // 生命周期方法
  // ========================

  async init(): Promise<void> {
    // MMKV 实例由外部创建，这里只需标记初始化完成
    this.initalized = true;
  }

  async close(): Promise<void> {
    // MMKV 不需要显式关闭
    this.initalized = false;
  }

  // ========================
  // 私有辅助方法
  // ========================

  /** 生成类型标记的 key */
  private typeKey(key: string): string {
    return `${key}:__type__`;
  }

  /** 序列化值（带类型标记） */
  private serialize(key: string, value: StorageValue): void {
    const fullKey = this.buildKey(key);
    const typeKey = this.typeKey(fullKey);

    if (value === null) {
      this.mmkv.set(fullKey, '');
      this.mmkv.set(typeKey, ValueType.NULL);
    } else if (typeof value === 'string') {
      this.mmkv.set(fullKey, value);
      this.mmkv.set(typeKey, ValueType.STRING);
    } else if (typeof value === 'number') {
      this.mmkv.set(fullKey, value);
      this.mmkv.set(typeKey, ValueType.NUMBER);
    } else if (typeof value === 'boolean') {
      this.mmkv.set(fullKey, value);
      this.mmkv.set(typeKey, ValueType.BOOLEAN);
    } else if (typeof value === 'object') {
      this.mmkv.set(fullKey, JSON.stringify(value));
      this.mmkv.set(typeKey, ValueType.OBJECT);
    }
  }

  /** 反序列化值（根据类型标记） */
  private deserialize<T>(key: string): T | null {
    const fullKey = this.buildKey(key);
    const typeKey = this.typeKey(fullKey);

    const type = this.mmkv.getString(typeKey);
    if (!type) {
      return null;
    }

    switch (type) {
      case ValueType.NULL:
        return null;
      case ValueType.STRING:
        return (this.mmkv.getString(fullKey) as T) ?? null;
      case ValueType.NUMBER:
        return (this.mmkv.getNumber(fullKey) as T) ?? null;
      case ValueType.BOOLEAN:
        return (this.mmkv.getBoolean(fullKey) as T) ?? null;
      case ValueType.OBJECT: {
        const json = this.mmkv.getString(fullKey);
        if (!json) return null;
        try {
          return JSON.parse(json) as T;
        } catch {
          throw new StorageError(
            `Failed to parse JSON for key: ${key}`,
            StorageErrorCode.DESERIALIZATION_FAILED
          );
        }
      }
      default:
        return null;
    }
  }

  // ========================
  // 基础 CRUD 操作
  // ========================

  async has(key: StorageKey): Promise<boolean> {
    const fullKey = this.buildKey(key);
    return this.mmkv.contains(fullKey) || this.mmkv.contains(`${fullKey}:__bytes__`);
  }

  async get<T = StorageValue>(key: StorageKey): Promise<T | null> {
    try {
      return this.deserialize<T>(key);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw StorageError.readFailed(key, error instanceof Error ? error : undefined);
    }
  }

  async set<T = StorageValue>(key: StorageKey, value: T): Promise<void> {
    try {
      this.serialize(key, value as StorageValue);
    } catch (error) {
      throw StorageError.writeFailed(key, error instanceof Error ? error : undefined);
    }
  }

  async remove(key: StorageKey): Promise<void> {
    const fullKey = this.buildKey(key);

    // 删除值和类型标记
    this.mmkv.delete(fullKey);
    this.mmkv.delete(this.typeKey(fullKey));

    // 删除可能存在的二进制数据
    this.mmkv.delete(`${fullKey}:__bytes__`);
  }

  async clear(): Promise<void> {
    const prefix = `${this.namespace}:`;
    const allKeys = this.mmkv.getAllKeys();

    for (const key of allKeys) {
      if (key.startsWith(prefix)) {
        this.mmkv.delete(key);
      }
    }
  }

  // ========================
  // 二进制数据操作
  // ========================

  async getBytes(key: StorageKey): Promise<Uint8Array | null> {
    const fullKey = `${this.buildKey(key)}:__bytes__`;

    try {
      const buffer = this.mmkv.getBuffer(fullKey);
      return buffer ?? null;
    } catch (error) {
      throw StorageError.readFailed(key, error instanceof Error ? error : undefined);
    }
  }

  async setBytes(key: StorageKey, bytes: Uint8Array): Promise<void> {
    const fullKey = `${this.buildKey(key)}:__bytes__`;

    try {
      // 复制一份，避免外部修改影响存储
      this.mmkv.set(fullKey, new Uint8Array(bytes));
    } catch (error) {
      throw StorageError.writeFailed(key, error instanceof Error ? error : undefined);
    }
  }

  // ========================
  // 查询操作
  // ========================

  async keys(prefix?: string): Promise<StorageKey[]> {
    const namespacePrefix = `${this.namespace}:`;
    const fullPrefix = prefix ? `${namespacePrefix}${prefix}` : namespacePrefix;

    const allKeys = this.mmkv.getAllKeys();
    const result = new Set<StorageKey>();

    for (const key of allKeys) {
      if (key.startsWith(fullPrefix)) {
        // 过滤掉类型标记键和二进制标记键
        if (key.endsWith(':__type__') || key.endsWith(':__bytes__')) {
          continue;
        }
        result.add(this.parseKey(key));
      }
    }

    return Array.from(result);
  }

  // ========================
  // 批量操作（优化版本）
  // ========================

  override async getMany<T = StorageValue>(keys: StorageKey[]): Promise<Map<StorageKey, T>> {
    const result = new Map<StorageKey, T>();

    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        result.set(key, value);
      }
    }

    return result;
  }

  override async setMany<T = StorageValue>(
    entries: Array<{ key: StorageKey; value: T }>
  ): Promise<void> {
    for (const { key, value } of entries) {
      await this.set(key, value);
    }
  }

  override async removeMany(keys: StorageKey[]): Promise<void> {
    for (const key of keys) {
      await this.remove(key);
    }
  }
}

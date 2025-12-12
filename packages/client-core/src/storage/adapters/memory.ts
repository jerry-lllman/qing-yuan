/**
 * 内存存储适配器
 * 用于测试和开发环境，数据不会持久化
 */
import { StorageAdapter } from '../adapter';
import { StorageAdapterConfig, StorageKey, StorageValue } from '../types';

export class MemoryStorageAdapter extends StorageAdapter {
  /** 普通数据存储 */
  private data = new Map<string, StorageValue>();
  /** 二进制数据存储 */
  private bytesData = new Map<string, Uint8Array>();

  constructor(config: StorageAdapterConfig) {
    super(config);
  }

  // ========================
  // 生命周期方法
  // ========================

  async init(): Promise<void> {
    this.initalized = true;
  }

  async close(): Promise<void> {
    this.data.clear();
    this.bytesData.clear();
    this.initalized = false;
  }

  // ========================
  // 基础 CRUD 操作
  // ========================

  async has(key: StorageKey): Promise<boolean> {
    const fullKey = this.buildKey(key);
    return this.data.has(fullKey) || this.bytesData.has(fullKey);
  }

  async get<T = StorageValue>(key: StorageKey): Promise<T | null> {
    const fullKey = this.buildKey(key);
    const value = this.data.get(fullKey);
    return (value as T) ?? null;
  }

  async set<T = StorageValue>(key: StorageKey, value: T): Promise<void> {
    const fullKey = this.buildKey(key);
    this.data.set(fullKey, value as StorageValue);
  }

  async remove(key: StorageKey): Promise<void> {
    const fullKey = this.buildKey(key);
    this.data.delete(fullKey);
    this.bytesData.delete(fullKey);
  }

  async clear(): Promise<void> {
    const prefix = `${this.namespace}:`;

    // 清除普通数据
    for (const key of this.data.keys()) {
      if (key.startsWith(prefix)) {
        this.data.delete(key);
      }
    }

    // 清除二进制数据
    for (const key of this.bytesData.keys()) {
      if (key.startsWith(prefix)) {
        this.bytesData.delete(key);
      }
    }
  }

  // ========================
  // 二进制数据操作
  // ========================

  async getBytes(key: StorageKey): Promise<Uint8Array | null> {
    const fullKey = this.buildKey(key);
    return this.bytesData.get(fullKey) ?? null;
  }

  async setBytes(key: StorageKey, bytes: Uint8Array): Promise<void> {
    const fullKey = this.buildKey(key);
    // 复制一份，避免外部修改影响存储
    this.bytesData.set(fullKey, new Uint8Array(bytes));
  }

  // ========================
  // 查询操作
  // ========================

  async keys(prefix?: string): Promise<StorageKey[]> {
    const namespacePrefix = `${this.namespace}:`;
    const fullPrefix = prefix ? `${namespacePrefix}${prefix}` : namespacePrefix;

    const result: StorageKey[] = [];

    // 从普通数据中查找
    for (const key of this.data.keys()) {
      if (key.startsWith(fullPrefix)) {
        result.push(this.parseKey(key));
      }
    }

    // 从二进制数据中查找
    for (const key of this.bytesData.keys()) {
      if (key.startsWith(fullPrefix) && !result.includes(this.parseKey(key))) {
        result.push(this.parseKey(key));
      }
    }

    return result;
  }

  // ========================
  // 批量操作（重写以提高性能）
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

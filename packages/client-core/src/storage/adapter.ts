import {
  IStorageAdapter,
  StorageAdapterConfig,
  StorageEntry,
  StorageKey,
  StorageNamespace,
  StorageValue,
} from './types';

export abstract class StorageAdapter implements IStorageAdapter {
  public readonly namespace: StorageNamespace;
  protected readonly config: StorageAdapterConfig;
  protected initalized = false;

  constructor(config: StorageAdapterConfig) {
    this.config = config;
    this.namespace = config.namespace;
  }

  /** 生成带命名空间的完整 key */
  protected buildKey(key: StorageKey): string {
    return `${this.namespace}:${key}`;
  }

  /** 从完整 key 中提取原始 key */
  protected parseKey(fullKey: string): StorageKey {
    const prefix = `${this.namespace}:`;
    return fullKey.startsWith(prefix) ? fullKey.slice(prefix.length) : fullKey;
  }

  // ======================
  // 子类必须实现的方法
  // ======================

  abstract init(): Promise<void>;
  abstract close(): Promise<void>;
  abstract has(key: StorageKey): Promise<boolean>;
  abstract get<T = unknown>(key: StorageKey): Promise<T | null>;
  abstract set<T = unknown>(key: StorageKey, value: T): Promise<void>;
  abstract remove(key: StorageKey): Promise<void>;
  abstract clear(): Promise<void>;
  abstract getBytes(key: StorageKey): Promise<Uint8Array | null>;
  abstract setBytes(key: StorageKey, bytes: Uint8Array): Promise<void>;
  abstract keys(prefix?: string): Promise<StorageKey[]>;

  // ======================
  // 可选实现的方法，子类可根据需要覆盖
  // ======================

  async getMany<T = StorageValue>(keys: StorageKey[]): Promise<Map<StorageKey, T>> {
    const result = new Map<StorageKey, T>();
    // 默认逐个获取，子类可覆盖以实现更高效的批量获取
    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key);
        if (value !== null) {
          result.set(key, value);
        }
      })
    );
    return result;
  }

  async setMany<T = StorageValue>(entries: StorageEntry<T>[]): Promise<void> {
    // 默认逐个设置，子类可覆盖以实现更高效的批量设置
    await Promise.all(entries.map(({ key, value }) => this.set<T>(key, value)));
  }

  async removeMany(keys: StorageKey[]): Promise<void> {
    await Promise.all(keys.map((key) => this.remove(key)));
  }

  async count(prefix?: string): Promise<number> {
    const keys = await this.keys(prefix);
    return keys.length;
  }
}

/**
 * IndexedDB 存储适配器
 * 用于 Web 平台的持久化存储
 */
import { openDB, IDBPDatabase, DBSchema } from 'idb';
import { StorageAdapter } from '../adapter';
import { StorageAdapterConfig, StorageKey, StorageValue } from '../types';
import { StorageError, StorageErrorCode } from '../errors';

/** IndexedDB 数据库 Schema */
interface QingYuanDBSchema extends DBSchema {
  /** 普通键值存储 */
  keyvalue: {
    key: string;
    value: StorageValue;
  };
  /** 二进制数据存储 */
  bytes: {
    key: string;
    value: Uint8Array;
  };
}

/** IndexedDB 存储适配器配置 */
export interface IndexedDBStorageAdapterConfig extends StorageAdapterConfig {
  /** 数据库名称，默认 'qyra-db' */
  name?: string;
  /** 数据库版本，默认 1 */
  version?: number;
}

/** 默认数据库名称 */
const DEFAULT_DB_NAME = 'qyra-db';
/** 默认数据库版本 */
const DEFAULT_DB_VERSION = 1;

/**
 * IndexedDB 存储适配器
 * 实现基于 IndexedDB 的持久化存储
 */
export class IndexedDBStorageAdapter extends StorageAdapter {
  private db: IDBPDatabase<QingYuanDBSchema> | null = null;
  private readonly dbName: string;
  private readonly dbVersion: number;

  constructor(config: IndexedDBStorageAdapterConfig) {
    super(config);
    this.dbName = config.name ?? DEFAULT_DB_NAME;
    this.dbVersion = config.version ?? DEFAULT_DB_VERSION;
  }

  // ========================
  // 生命周期方法
  // ========================

  async init(): Promise<void> {
    if (this.initalized) {
      return;
    }

    try {
      this.db = await openDB<QingYuanDBSchema>(this.dbName, this.dbVersion, {
        upgrade(db) {
          // 创建普通键值存储
          if (!db.objectStoreNames.contains('keyvalue')) {
            db.createObjectStore('keyvalue');
          }
          // 创建二进制数据存储
          if (!db.objectStoreNames.contains('bytes')) {
            db.createObjectStore('bytes');
          }
        },
      });
      this.initalized = true;
    } catch (error) {
      throw StorageError.initFailed(
        `Failed to open IndexedDB: ${this.dbName}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initalized = false;
  }

  // ========================
  // 私有辅助方法
  // ========================

  private ensureInitialized(): void {
    if (!this.db) {
      throw new StorageError(
        'IndexedDB not initialized. Call init() first.',
        StorageErrorCode.UNAVAILABLE
      );
    }
  }

  // ========================
  // 基础 CRUD 操作
  // ========================

  async has(key: StorageKey): Promise<boolean> {
    this.ensureInitialized();
    const fullKey = this.buildKey(key);

    try {
      const value = await this.db!.get('keyvalue', fullKey);
      if (value !== undefined) {
        return true;
      }
      const bytesValue = await this.db!.get('bytes', fullKey);
      return bytesValue !== undefined;
    } catch (error) {
      throw StorageError.readFailed(key, error instanceof Error ? error : undefined);
    }
  }

  async get<T = StorageValue>(key: StorageKey): Promise<T | null> {
    this.ensureInitialized();
    const fullKey = this.buildKey(key);

    try {
      const value = await this.db!.get('keyvalue', fullKey);
      return (value as T) ?? null;
    } catch (error) {
      throw StorageError.readFailed(key, error instanceof Error ? error : undefined);
    }
  }

  async set<T = StorageValue>(key: StorageKey, value: T): Promise<void> {
    this.ensureInitialized();
    const fullKey = this.buildKey(key);

    try {
      await this.db!.put('keyvalue', value as StorageValue, fullKey);
    } catch (error) {
      if (this.isQuotaError(error)) {
        throw StorageError.quotaExceeded(error instanceof Error ? error : undefined);
      }
      throw StorageError.writeFailed(key, error instanceof Error ? error : undefined);
    }
  }

  async remove(key: StorageKey): Promise<void> {
    this.ensureInitialized();
    const fullKey = this.buildKey(key);

    try {
      await this.db!.delete('keyvalue', fullKey);
      await this.db!.delete('bytes', fullKey);
    } catch (error) {
      throw StorageError.writeFailed(key, error instanceof Error ? error : undefined);
    }
  }

  async clear(): Promise<void> {
    this.ensureInitialized();
    const prefix = `${this.namespace}:`;

    try {
      // 清除 keyvalue store 中的数据
      const kvTx = this.db!.transaction('keyvalue', 'readwrite');
      const kvStore = kvTx.objectStore('keyvalue');
      let kvCursor = await kvStore.openCursor();
      while (kvCursor) {
        if (kvCursor.key.toString().startsWith(prefix)) {
          await kvCursor.delete();
        }
        kvCursor = await kvCursor.continue();
      }
      await kvTx.done;

      // 清除 bytes store 中的数据
      const bytesTx = this.db!.transaction('bytes', 'readwrite');
      const bytesStore = bytesTx.objectStore('bytes');
      let bytesCursor = await bytesStore.openCursor();
      while (bytesCursor) {
        if (bytesCursor.key.toString().startsWith(prefix)) {
          await bytesCursor.delete();
        }
        bytesCursor = await bytesCursor.continue();
      }
      await bytesTx.done;
    } catch (error) {
      throw new StorageError(
        'Failed to clear storage',
        StorageErrorCode.WRITE_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  // ========================
  // 二进制数据操作
  // ========================

  async getBytes(key: StorageKey): Promise<Uint8Array | null> {
    this.ensureInitialized();
    const fullKey = this.buildKey(key);

    try {
      const value = await this.db!.get('bytes', fullKey);
      return value ?? null;
    } catch (error) {
      throw StorageError.readFailed(key, error instanceof Error ? error : undefined);
    }
  }

  async setBytes(key: StorageKey, bytes: Uint8Array): Promise<void> {
    this.ensureInitialized();
    const fullKey = this.buildKey(key);

    try {
      // 复制一份，避免外部修改影响存储
      await this.db!.put('bytes', new Uint8Array(bytes), fullKey);
    } catch (error) {
      if (this.isQuotaError(error)) {
        throw StorageError.quotaExceeded(error instanceof Error ? error : undefined);
      }
      throw StorageError.writeFailed(key, error instanceof Error ? error : undefined);
    }
  }

  // ========================
  // 查询操作
  // ========================

  async keys(prefix?: string): Promise<StorageKey[]> {
    this.ensureInitialized();
    const namespacePrefix = `${this.namespace}:`;
    const fullPrefix = prefix ? `${namespacePrefix}${prefix}` : namespacePrefix;
    const result: StorageKey[] = [];

    try {
      // 从 keyvalue store 获取 keys
      const kvKeys = await this.db!.getAllKeys('keyvalue');
      for (const key of kvKeys) {
        const keyStr = key.toString();
        if (keyStr.startsWith(fullPrefix)) {
          result.push(this.parseKey(keyStr));
        }
      }

      // 从 bytes store 获取 keys
      const bytesKeys = await this.db!.getAllKeys('bytes');
      for (const key of bytesKeys) {
        const keyStr = key.toString();
        if (keyStr.startsWith(fullPrefix)) {
          const parsedKey = this.parseKey(keyStr);
          if (!result.includes(parsedKey)) {
            result.push(parsedKey);
          }
        }
      }

      return result;
    } catch (error) {
      throw new StorageError(
        'Failed to get keys',
        StorageErrorCode.READ_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  // ========================
  // 批量操作（优化版本）
  // ========================

  override async getMany<T = StorageValue>(keys: StorageKey[]): Promise<Map<StorageKey, T>> {
    this.ensureInitialized();
    const result = new Map<StorageKey, T>();

    try {
      const tx = this.db!.transaction('keyvalue', 'readonly');
      const store = tx.objectStore('keyvalue');

      await Promise.all(
        keys.map(async (key) => {
          const fullKey = this.buildKey(key);
          const value = await store.get(fullKey);
          if (value !== undefined) {
            result.set(key, value as T);
          }
        })
      );

      await tx.done;
      return result;
    } catch (error) {
      throw new StorageError(
        'Failed to get many values',
        StorageErrorCode.READ_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  override async setMany<T = StorageValue>(
    entries: Array<{ key: StorageKey; value: T }>
  ): Promise<void> {
    this.ensureInitialized();

    try {
      const tx = this.db!.transaction('keyvalue', 'readwrite');
      const store = tx.objectStore('keyvalue');

      await Promise.all(
        entries.map(({ key, value }) => {
          const fullKey = this.buildKey(key);
          return store.put(value as StorageValue, fullKey);
        })
      );

      await tx.done;
    } catch (error) {
      if (this.isQuotaError(error)) {
        throw StorageError.quotaExceeded(error instanceof Error ? error : undefined);
      }
      throw new StorageError(
        'Failed to set many values',
        StorageErrorCode.WRITE_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  override async removeMany(keys: StorageKey[]): Promise<void> {
    this.ensureInitialized();

    try {
      // 从 keyvalue store 删除
      const kvTx = this.db!.transaction('keyvalue', 'readwrite');
      const kvStore = kvTx.objectStore('keyvalue');
      await Promise.all(
        keys.map((key) => {
          const fullKey = this.buildKey(key);
          return kvStore.delete(fullKey);
        })
      );
      await kvTx.done;

      // 从 bytes store 删除
      const bytesTx = this.db!.transaction('bytes', 'readwrite');
      const bytesStore = bytesTx.objectStore('bytes');
      await Promise.all(
        keys.map((key) => {
          const fullKey = this.buildKey(key);
          return bytesStore.delete(fullKey);
        })
      );
      await bytesTx.done;
    } catch (error) {
      throw new StorageError(
        'Failed to remove many values',
        StorageErrorCode.WRITE_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  // ========================
  // 私有辅助方法
  // ========================

  private isQuotaError(error: unknown): boolean {
    if (error instanceof DOMException) {
      return error.name === 'QuotaExceededError' || error.code === 22;
    }
    return false;
  }
}

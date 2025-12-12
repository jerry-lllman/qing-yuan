/**
 * IndexedDB 存储适配器测试
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IndexedDBStorageAdapter } from './indexeddb';
import { StorageError, StorageErrorCode } from '../errors';

describe('IndexedDBStorageAdapter', () => {
  let adapter: IndexedDBStorageAdapter;
  let testDbCounter = 0;

  beforeEach(async () => {
    testDbCounter++;
    adapter = new IndexedDBStorageAdapter({
      namespace: 'encryption',
      name: `test-db-${Date.now()}-${testDbCounter}`, // 确保每次测试使用新数据库
      version: 1,
    });
    await adapter.init();
  });

  afterEach(async () => {
    await adapter.close();
  });

  // ========================
  // 初始化测试
  // ========================

  describe('init', () => {
    it('should initialize successfully', async () => {
      const newAdapter = new IndexedDBStorageAdapter({
        namespace: 'app',
        name: `init-test-${Date.now()}`,
      });
      await expect(newAdapter.init()).resolves.not.toThrow();
      await newAdapter.close();
    });

    it('should be idempotent', async () => {
      await expect(adapter.init()).resolves.not.toThrow();
      await expect(adapter.init()).resolves.not.toThrow();
    });
  });

  describe('close', () => {
    it('should close successfully', async () => {
      await expect(adapter.close()).resolves.not.toThrow();
    });

    it('should be idempotent', async () => {
      await adapter.close();
      await expect(adapter.close()).resolves.not.toThrow();
    });
  });

  // ========================
  // 基础 CRUD 测试
  // ========================

  describe('get/set', () => {
    it('should store and retrieve string value', async () => {
      await adapter.set('key1', 'value1');
      const result = await adapter.get<string>('key1');
      expect(result).toBe('value1');
    });

    it('should store and retrieve number value', async () => {
      await adapter.set('num', 42);
      const result = await adapter.get<number>('num');
      expect(result).toBe(42);
    });

    it('should store and retrieve boolean value', async () => {
      await adapter.set('bool', true);
      const result = await adapter.get<boolean>('bool');
      expect(result).toBe(true);
    });

    it('should store and retrieve object value', async () => {
      const obj = { name: 'test', count: 10 };
      await adapter.set('obj', obj);
      const result = await adapter.get<typeof obj>('obj');
      expect(result).toEqual(obj);
    });

    it('should store and retrieve null value', async () => {
      await adapter.set('null', null);
      const result = await adapter.get('null');
      expect(result).toBeNull();
    });

    it('should return null for non-existent key', async () => {
      const result = await adapter.get('non-existent');
      expect(result).toBeNull();
    });

    it('should overwrite existing value', async () => {
      await adapter.set('key', 'original');
      await adapter.set('key', 'updated');
      const result = await adapter.get<string>('key');
      expect(result).toBe('updated');
    });
  });

  describe('has', () => {
    it('should return true for existing key', async () => {
      await adapter.set('exists', 'value');
      expect(await adapter.has('exists')).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      expect(await adapter.has('not-exists')).toBe(false);
    });

    it('should return true for existing bytes key', async () => {
      await adapter.setBytes('bytesKey', new Uint8Array([1, 2, 3]));
      expect(await adapter.has('bytesKey')).toBe(true);
    });
  });

  describe('remove', () => {
    it('should remove existing key', async () => {
      await adapter.set('toRemove', 'value');
      await adapter.remove('toRemove');
      expect(await adapter.has('toRemove')).toBe(false);
    });

    it('should not throw when removing non-existent key', async () => {
      await expect(adapter.remove('non-existent')).resolves.not.toThrow();
    });

    it('should remove from both stores', async () => {
      await adapter.set('key', 'value');
      await adapter.setBytes('key', new Uint8Array([1, 2, 3]));
      await adapter.remove('key');
      expect(await adapter.get('key')).toBeNull();
      expect(await adapter.getBytes('key')).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all data in namespace', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.setBytes('bytes1', new Uint8Array([1, 2, 3]));

      await adapter.clear();

      expect(await adapter.get('key1')).toBeNull();
      expect(await adapter.get('key2')).toBeNull();
      expect(await adapter.getBytes('bytes1')).toBeNull();
    });

    it('should not affect other namespaces', async () => {
      const otherAdapter = new IndexedDBStorageAdapter({
        namespace: 'messages',
        name: adapter['dbName'], // 使用相同数据库
      });
      await otherAdapter.init();

      await adapter.set('key', 'encryption-value');
      await otherAdapter.set('key', 'messages-value');

      await adapter.clear();

      expect(await adapter.get('key')).toBeNull();
      expect(await otherAdapter.get<string>('key')).toBe('messages-value');

      await otherAdapter.close();
    });
  });

  // ========================
  // 二进制数据测试
  // ========================

  describe('getBytes/setBytes', () => {
    it('should store and retrieve Uint8Array', async () => {
      const bytes = new Uint8Array([1, 2, 3, 4, 5]);
      await adapter.setBytes('binary', bytes);
      const result = await adapter.getBytes('binary');
      expect(result).toEqual(bytes);
    });

    it('should return null for non-existent bytes key', async () => {
      const result = await adapter.getBytes('non-existent');
      expect(result).toBeNull();
    });

    it('should store a copy of bytes', async () => {
      const bytes = new Uint8Array([1, 2, 3]);
      await adapter.setBytes('binary', bytes);

      // 修改原数组
      bytes[0] = 99;

      // 存储的值不应受影响
      const result = await adapter.getBytes('binary');
      expect(result![0]).toBe(1);
    });

    it('should handle empty Uint8Array', async () => {
      const bytes = new Uint8Array([]);
      await adapter.setBytes('empty', bytes);
      const result = await adapter.getBytes('empty');
      expect(result).toEqual(bytes);
    });

    it('should handle large Uint8Array', async () => {
      const bytes = new Uint8Array(10000).map((_, i) => i % 256);
      await adapter.setBytes('large', bytes);
      const result = await adapter.getBytes('large');
      expect(result).toEqual(bytes);
    });
  });

  // ========================
  // 批量操作测试
  // ========================

  describe('getMany', () => {
    it('should get multiple values', async () => {
      await adapter.set('a', 1);
      await adapter.set('b', 2);
      await adapter.set('c', 3);

      const result = await adapter.getMany<number>(['a', 'b', 'c']);

      expect(result.size).toBe(3);
      expect(result.get('a')).toBe(1);
      expect(result.get('b')).toBe(2);
      expect(result.get('c')).toBe(3);
    });

    it('should skip non-existent keys', async () => {
      await adapter.set('exists', 'value');

      const result = await adapter.getMany(['exists', 'not-exists']);

      expect(result.size).toBe(1);
      expect(result.get('exists')).toBe('value');
      expect(result.has('not-exists')).toBe(false);
    });

    it('should return empty map for empty input', async () => {
      const result = await adapter.getMany([]);
      expect(result.size).toBe(0);
    });
  });

  describe('setMany', () => {
    it('should set multiple values', async () => {
      await adapter.setMany([
        { key: 'x', value: 10 },
        { key: 'y', value: 20 },
        { key: 'z', value: 30 },
      ]);

      expect(await adapter.get<number>('x')).toBe(10);
      expect(await adapter.get<number>('y')).toBe(20);
      expect(await adapter.get<number>('z')).toBe(30);
    });

    it('should handle empty input', async () => {
      await expect(adapter.setMany([])).resolves.not.toThrow();
    });
  });

  describe('removeMany', () => {
    it('should remove multiple keys', async () => {
      await adapter.set('a', 1);
      await adapter.set('b', 2);
      await adapter.set('c', 3);

      await adapter.removeMany(['a', 'b']);

      expect(await adapter.has('a')).toBe(false);
      expect(await adapter.has('b')).toBe(false);
      expect(await adapter.has('c')).toBe(true);
    });

    it('should handle empty input', async () => {
      await expect(adapter.removeMany([])).resolves.not.toThrow();
    });
  });

  // ========================
  // 查询操作测试
  // ========================

  describe('keys', () => {
    it('should return all keys in namespace', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.setBytes('bytes1', new Uint8Array([1]));

      const keys = await adapter.keys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('bytes1');
    });

    it('should filter keys by prefix', async () => {
      await adapter.set('user:1', 'alice');
      await adapter.set('user:2', 'bob');
      await adapter.set('session:1', 'data');

      const keys = await adapter.keys('user:');

      expect(keys).toHaveLength(2);
      expect(keys).toContain('user:1');
      expect(keys).toContain('user:2');
    });

    it('should return empty array when no keys match', async () => {
      await adapter.set('key', 'value');
      const keys = await adapter.keys('nonexistent:');
      expect(keys).toHaveLength(0);
    });

    it('should not return duplicate keys', async () => {
      // 同一个 key 在两个 store 中
      await adapter.set('key', 'value');
      await adapter.setBytes('key', new Uint8Array([1]));

      const keys = await adapter.keys();
      const keyCount = keys.filter((k) => k === 'key').length;
      expect(keyCount).toBe(1);
    });
  });

  describe('count', () => {
    it('should return correct count', async () => {
      await adapter.set('a', 1);
      await adapter.set('b', 2);
      await adapter.set('c', 3);

      const count = await adapter.count();
      expect(count).toBe(3);
    });

    it('should return count with prefix filter', async () => {
      await adapter.set('user:1', 'alice');
      await adapter.set('user:2', 'bob');
      await adapter.set('session:1', 'data');

      const count = await adapter.count('user:');
      expect(count).toBe(2);
    });

    it('should return 0 for empty storage', async () => {
      // 使用新的适配器确保没有残留数据
      const freshAdapter = new IndexedDBStorageAdapter({
        namespace: 'encryption',
        name: `empty-test-${Date.now()}`,
      });
      await freshAdapter.init();
      const count = await freshAdapter.count();
      expect(count).toBe(0);
      await freshAdapter.close();
    });
  });

  // ========================
  // 错误处理测试
  // ========================

  describe('error handling', () => {
    it('should throw when not initialized', async () => {
      const uninitializedAdapter = new IndexedDBStorageAdapter({
        namespace: 'encryption',
        name: 'uninitialized-db',
      });

      await expect(uninitializedAdapter.get('key')).rejects.toThrow(StorageError);
      await expect(uninitializedAdapter.get('key')).rejects.toMatchObject({
        code: StorageErrorCode.UNAVAILABLE,
      });
    });

    it('should throw when closed and trying to operate', async () => {
      await adapter.close();

      await expect(adapter.get('key')).rejects.toThrow(StorageError);
    });
  });

  // ========================
  // 命名空间隔离测试
  // ========================

  describe('namespace isolation', () => {
    it('should isolate data between namespaces', async () => {
      const adapter1 = new IndexedDBStorageAdapter({
        namespace: 'encryption',
        name: `isolation-test-${Date.now()}`,
      });
      const adapter2 = new IndexedDBStorageAdapter({
        namespace: 'messages',
        name: adapter1['dbName'],
      });

      await adapter1.init();
      await adapter2.init();

      await adapter1.set('key', 'value1');
      await adapter2.set('key', 'value2');

      expect(await adapter1.get<string>('key')).toBe('value1');
      expect(await adapter2.get<string>('key')).toBe('value2');

      await adapter1.close();
      await adapter2.close();
    });
  });
});

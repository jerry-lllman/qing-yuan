/**
 * MMKV 存储适配器测试
 * 使用 mock 模拟 MMKV 实例
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MMKVStorageAdapter, IMMKVInstance } from './mmkv';

/**
 * 创建 MMKV Mock 实例
 */
function createMMKVMock(): IMMKVInstance {
  const storage = new Map<string, string | number | boolean | Uint8Array>();

  return {
    getString(key: string): string | undefined {
      const value = storage.get(key);
      return typeof value === 'string' ? value : undefined;
    },
    getNumber(key: string): number | undefined {
      const value = storage.get(key);
      return typeof value === 'number' ? value : undefined;
    },
    getBoolean(key: string): boolean | undefined {
      const value = storage.get(key);
      return typeof value === 'boolean' ? value : undefined;
    },
    getBuffer(key: string): Uint8Array | undefined {
      const value = storage.get(key);
      return value instanceof Uint8Array ? value : undefined;
    },
    set(key: string, value: string | number | boolean | Uint8Array): void {
      storage.set(key, value);
    },
    delete(key: string): void {
      storage.delete(key);
    },
    contains(key: string): boolean {
      return storage.has(key);
    },
    getAllKeys(): string[] {
      return Array.from(storage.keys());
    },
    clearAll(): void {
      storage.clear();
    },
  };
}

describe('MMKVStorageAdapter', () => {
  let adapter: MMKVStorageAdapter;
  let mmkvMock: IMMKVInstance;

  beforeEach(async () => {
    mmkvMock = createMMKVMock();
    adapter = new MMKVStorageAdapter({
      namespace: 'encryption',
      mmkv: mmkvMock,
    });
    await adapter.init();
  });

  // ========================
  // 生命周期测试
  // ========================

  describe('lifecycle', () => {
    it('should initialize successfully', async () => {
      const newAdapter = new MMKVStorageAdapter({
        namespace: 'app',
        mmkv: createMMKVMock(),
      });
      await expect(newAdapter.init()).resolves.not.toThrow();
    });

    it('should close successfully', async () => {
      await expect(adapter.close()).resolves.not.toThrow();
    });
  });

  // ========================
  // 基础 CRUD 测试
  // ========================

  describe('get/set', () => {
    it('should store and retrieve string value', async () => {
      await adapter.set('key', 'value');
      const result = await adapter.get<string>('key');
      expect(result).toBe('value');
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

    it('should store and retrieve false boolean', async () => {
      await adapter.set('boolFalse', false);
      const result = await adapter.get<boolean>('boolFalse');
      expect(result).toBe(false);
    });

    it('should store and retrieve object value', async () => {
      const obj = { name: 'test', count: 10, nested: { a: 1 } };
      await adapter.set('obj', obj);
      const result = await adapter.get<typeof obj>('obj');
      expect(result).toEqual(obj);
    });

    it('should store and retrieve array value', async () => {
      const arr = [1, 2, 3, 'four', { five: 5 }];
      await adapter.set('arr', arr);
      const result = await adapter.get<typeof arr>('arr');
      expect(result).toEqual(arr);
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

    it('should handle zero number', async () => {
      await adapter.set('zero', 0);
      const result = await adapter.get<number>('zero');
      expect(result).toBe(0);
    });

    it('should handle empty string', async () => {
      await adapter.set('empty', '');
      const result = await adapter.get<string>('empty');
      expect(result).toBe('');
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

    it('should remove type marker as well', async () => {
      await adapter.set('key', 'value');
      await adapter.remove('key');
      const result = await adapter.get('key');
      expect(result).toBeNull();
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
      const otherAdapter = new MMKVStorageAdapter({
        namespace: 'messages',
        mmkv: mmkvMock, // 使用相同的 mock
      });
      await otherAdapter.init();

      await adapter.set('key', 'encryption-value');
      await otherAdapter.set('key', 'messages-value');

      await adapter.clear();

      expect(await adapter.get('key')).toBeNull();
      expect(await otherAdapter.get<string>('key')).toBe('messages-value');
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
  });

  // ========================
  // 查询操作测试
  // ========================

  describe('keys', () => {
    it('should return all keys in namespace', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');

      const keys = await adapter.keys();

      expect(keys).toHaveLength(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
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

    it('should not include type markers in keys', async () => {
      await adapter.set('key', 'value');

      const keys = await adapter.keys();

      expect(keys).toHaveLength(1);
      expect(keys).toContain('key');
      expect(keys.some((k) => k.includes('__type__'))).toBe(false);
    });

    it('should not include bytes markers in keys', async () => {
      await adapter.setBytes('key', new Uint8Array([1, 2, 3]));

      const keys = await adapter.keys();

      expect(keys.some((k) => k.includes('__bytes__'))).toBe(false);
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
  });

  // ========================
  // 命名空间隔离测试
  // ========================

  describe('namespace isolation', () => {
    it('should isolate data between namespaces', async () => {
      const sharedMmkv = createMMKVMock();

      const adapter1 = new MMKVStorageAdapter({
        namespace: 'encryption',
        mmkv: sharedMmkv,
      });
      const adapter2 = new MMKVStorageAdapter({
        namespace: 'messages',
        mmkv: sharedMmkv,
      });

      await adapter1.init();
      await adapter2.init();

      await adapter1.set('key', 'value1');
      await adapter2.set('key', 'value2');

      expect(await adapter1.get<string>('key')).toBe('value1');
      expect(await adapter2.get<string>('key')).toBe('value2');
    });
  });
});

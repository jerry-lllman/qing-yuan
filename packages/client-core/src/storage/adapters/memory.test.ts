import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorageAdapter } from './memory';
import type { StorageAdapterConfig } from '../types';

describe('MemoryStorageAdapter', () => {
  let adapter: MemoryStorageAdapter;
  const config: StorageAdapterConfig = {
    namespace: 'encryption',
    name: 'test-db',
  };

  beforeEach(async () => {
    adapter = new MemoryStorageAdapter(config);
    await adapter.init();
  });

  describe('lifecycle', () => {
    it('should initialize successfully', async () => {
      const newAdapter = new MemoryStorageAdapter(config);
      await expect(newAdapter.init()).resolves.toBeUndefined();
    });

    it('should close and clear all data', async () => {
      await adapter.set('key1', 'value1');
      await adapter.close();

      // Reinitialize to check data is cleared
      await adapter.init();
      const value = await adapter.get('key1');
      expect(value).toBeNull();
    });
  });

  describe('basic CRUD operations', () => {
    it('should set and get a value', async () => {
      await adapter.set('testKey', 'testValue');
      const value = await adapter.get<string>('testKey');
      expect(value).toBe('testValue');
    });

    it('should return null for non-existent key', async () => {
      const value = await adapter.get('nonExistent');
      expect(value).toBeNull();
    });

    it('should check if key exists', async () => {
      await adapter.set('existingKey', 'value');

      expect(await adapter.has('existingKey')).toBe(true);
      expect(await adapter.has('nonExistent')).toBe(false);
    });

    it('should remove a value', async () => {
      await adapter.set('toRemove', 'value');
      await adapter.remove('toRemove');

      const value = await adapter.get('toRemove');
      expect(value).toBeNull();
    });

    it('should clear all values in namespace', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.clear();

      expect(await adapter.get('key1')).toBeNull();
      expect(await adapter.get('key2')).toBeNull();
    });

    it('should store different types of values', async () => {
      await adapter.set('string', 'hello');
      await adapter.set('number', 42);
      await adapter.set('boolean', true);
      await adapter.set('object', { foo: 'bar' });
      await adapter.set('null', null);

      expect(await adapter.get('string')).toBe('hello');
      expect(await adapter.get('number')).toBe(42);
      expect(await adapter.get('boolean')).toBe(true);
      expect(await adapter.get('object')).toEqual({ foo: 'bar' });
      expect(await adapter.get('null')).toBeNull();
    });
  });

  describe('binary data operations', () => {
    it('should set and get bytes', async () => {
      const bytes = new Uint8Array([1, 2, 3, 4, 5]);
      await adapter.setBytes('binaryKey', bytes);

      const result = await adapter.getBytes('binaryKey');
      expect(result).toEqual(bytes);
    });

    it('should return null for non-existent bytes key', async () => {
      const result = await adapter.getBytes('nonExistent');
      expect(result).toBeNull();
    });

    it('should not be affected by external modification', async () => {
      const bytes = new Uint8Array([1, 2, 3]);
      await adapter.setBytes('binaryKey', bytes);

      // Modify original array
      bytes[0] = 99;

      const result = await adapter.getBytes('binaryKey');
      expect(result![0]).toBe(1); // Should still be original value
    });

    it('should check existence for bytes keys', async () => {
      await adapter.setBytes('binaryKey', new Uint8Array([1, 2, 3]));

      expect(await adapter.has('binaryKey')).toBe(true);
    });
  });

  describe('batch operations', () => {
    it('should get many values', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.set('key3', 'value3');

      const result = await adapter.getMany<string>(['key1', 'key2', 'nonExistent']);

      expect(result.size).toBe(2);
      expect(result.get('key1')).toBe('value1');
      expect(result.get('key2')).toBe('value2');
      expect(result.has('nonExistent')).toBe(false);
    });

    it('should set many values', async () => {
      await adapter.setMany([
        { key: 'batch1', value: 'value1' },
        { key: 'batch2', value: 'value2' },
        { key: 'batch3', value: 'value3' },
      ]);

      expect(await adapter.get('batch1')).toBe('value1');
      expect(await adapter.get('batch2')).toBe('value2');
      expect(await adapter.get('batch3')).toBe('value3');
    });

    it('should remove many values', async () => {
      await adapter.set('rem1', 'value1');
      await adapter.set('rem2', 'value2');
      await adapter.set('rem3', 'value3');

      await adapter.removeMany(['rem1', 'rem2']);

      expect(await adapter.get('rem1')).toBeNull();
      expect(await adapter.get('rem2')).toBeNull();
      expect(await adapter.get('rem3')).toBe('value3');
    });
  });

  describe('query operations', () => {
    it('should get all keys', async () => {
      await adapter.set('a', 1);
      await adapter.set('b', 2);
      await adapter.set('c', 3);

      const keys = await adapter.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys).toContain('c');
    });

    it('should get keys with prefix', async () => {
      await adapter.set('user:1', 'Alice');
      await adapter.set('user:2', 'Bob');
      await adapter.set('message:1', 'Hello');

      const userKeys = await adapter.keys('user:');
      expect(userKeys).toHaveLength(2);
      expect(userKeys).toContain('user:1');
      expect(userKeys).toContain('user:2');
    });

    it('should count all entries', async () => {
      await adapter.set('a', 1);
      await adapter.set('b', 2);
      await adapter.setBytes('c', new Uint8Array([1]));

      const count = await adapter.count();
      expect(count).toBe(3);
    });

    it('should count entries with prefix', async () => {
      await adapter.set('session:1', 'data1');
      await adapter.set('session:2', 'data2');
      await adapter.set('prekey:1', 'key1');

      const sessionCount = await adapter.count('session:');
      expect(sessionCount).toBe(2);
    });
  });

  describe('namespace isolation', () => {
    it('should isolate data between namespaces', async () => {
      const adapter1 = new MemoryStorageAdapter({ namespace: 'encryption' });
      const adapter2 = new MemoryStorageAdapter({ namespace: 'messages' });

      await adapter1.init();
      await adapter2.init();

      await adapter1.set('sharedKey', 'value1');
      await adapter2.set('sharedKey', 'value2');

      expect(await adapter1.get('sharedKey')).toBe('value1');
      expect(await adapter2.get('sharedKey')).toBe('value2');

      // Clear one should not affect the other
      await adapter1.clear();
      expect(await adapter1.get('sharedKey')).toBeNull();
      expect(await adapter2.get('sharedKey')).toBe('value2');
    });
  });
});

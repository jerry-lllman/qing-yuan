/**
 * Query Client 测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createQueryClient,
  getQueryClient,
  resetQueryClient,
  invalidateQueries,
  setQueryData,
  getQueryData,
  removeQueries,
  DEFAULT_STALE_TIME,
  DEFAULT_GC_TIME,
  DEFAULT_RETRY_COUNT,
} from './query-client';

describe('Query Client', () => {
  beforeEach(() => {
    resetQueryClient();
  });

  afterEach(() => {
    resetQueryClient();
  });

  describe('常量', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_STALE_TIME).toBe(5 * 60 * 1000);
      expect(DEFAULT_GC_TIME).toBe(30 * 60 * 1000);
      expect(DEFAULT_RETRY_COUNT).toBe(3);
    });
  });

  describe('createQueryClient', () => {
    it('should create a new QueryClient instance', () => {
      const client = createQueryClient();

      expect(client).toBeDefined();
      expect(typeof client.getQueryData).toBe('function');
      expect(typeof client.setQueryData).toBe('function');
    });

    it('should use default options', () => {
      const client = createQueryClient();
      const defaultOptions = client.getDefaultOptions();

      expect(defaultOptions.queries?.staleTime).toBe(DEFAULT_STALE_TIME);
      expect(defaultOptions.queries?.gcTime).toBe(DEFAULT_GC_TIME);
      expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
    });

    it('should accept custom options', () => {
      const client = createQueryClient({
        staleTime: 1000,
        gcTime: 2000,
        retry: false,
      });
      const defaultOptions = client.getDefaultOptions();

      expect(defaultOptions.queries?.staleTime).toBe(1000);
      expect(defaultOptions.queries?.gcTime).toBe(2000);
      expect(defaultOptions.queries?.retry).toBe(0);
    });
  });

  describe('getQueryClient', () => {
    it('should return a singleton QueryClient', () => {
      const client1 = getQueryClient();
      const client2 = getQueryClient();

      expect(client1).toBe(client2);
    });

    it('should create new instance after reset', () => {
      const client1 = getQueryClient();
      resetQueryClient();
      const client2 = getQueryClient();

      expect(client1).not.toBe(client2);
    });
  });

  describe('resetQueryClient', () => {
    it('should reset the global client', () => {
      const client1 = getQueryClient();
      // 设置一些数据
      client1.setQueryData(['test'], { value: 1 });

      resetQueryClient();

      const client2 = getQueryClient();
      expect(client2.getQueryData(['test'])).toBeUndefined();
    });
  });

  describe('setQueryData / getQueryData', () => {
    it('should set and get query data', () => {
      const data = { id: 1, name: 'Test' };

      setQueryData(['test', 'data'], data);
      const result = getQueryData<typeof data>(['test', 'data']);

      expect(result).toEqual(data);
    });

    it('should return undefined for non-existent key', () => {
      const result = getQueryData(['non', 'existent']);

      expect(result).toBeUndefined();
    });

    it('should support updater function', () => {
      setQueryData(['counter'], 0);
      setQueryData<number>(['counter'], (old) => (old ?? 0) + 1);

      const result = getQueryData<number>(['counter']);
      expect(result).toBe(1);
    });
  });

  describe('removeQueries', () => {
    it('should remove query data', () => {
      setQueryData(['to-remove'], { value: 1 });
      expect(getQueryData(['to-remove'])).toBeDefined();

      removeQueries(['to-remove']);

      expect(getQueryData(['to-remove'])).toBeUndefined();
    });
  });

  describe('invalidateQueries', () => {
    it('should invalidate queries', async () => {
      setQueryData(['to-invalidate'], { value: 1 });

      await invalidateQueries(['to-invalidate']);

      // 数据仍然存在，但被标记为 stale
      const client = getQueryClient();
      const state = client.getQueryState(['to-invalidate']);
      expect(state?.isInvalidated).toBe(true);
    });
  });
});

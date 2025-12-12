// Types
export type {
  StorageNamespace,
  StorageKey,
  StorageValue,
  StorageEntry,
  StorageAdapterConfig,
  IStorageAdapter,
  ISignalStorageAdapter,
} from './types';

// Errors
export { StorageError, StorageErrorCode } from './errors';

// Base class
export { StorageAdapter } from './adapter';

// Signal adapter
export { SignalStorageAdapter } from './signal-adapter';

// Platform adapters
export { MemoryStorageAdapter } from './adapters/memory';
export { IndexedDBStorageAdapter } from './adapters/indexeddb';
export type { IndexedDBStorageAdapterConfig } from './adapters/indexeddb';
export { MMKVStorageAdapter } from './adapters/mmkv';
export type { MMKVStorageAdapterConfig, IMMKVInstance } from './adapters/mmkv';

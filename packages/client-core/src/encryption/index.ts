/**
 * 加密客户端
 * 封装 Signal Protocol 会话管理，提供统一的加密/解密 API
 */
import type { IStorageAdapter } from '../storage/types';
import { SignalStorageAdapter } from '../storage/signal-adapter';

/**
 * 加密客户端配置
 */
export interface EncryptionClientConfig {
  /** 存储适配器（IndexedDB/MMKV/Memory） */
  storage: IStorageAdapter;
  /** 设备 ID */
  deviceId?: number;
}

/**
 * 设备密钥信息
 */
export interface DeviceKeyInfo {
  /** 身份公钥 (Base64) */
  identityKey: string;
  /** 注册 ID */
  registrationId: number;
  /** 设备 ID */
  deviceId: number;
}

/**
 * 预密钥包（用于建立会话）
 */
export interface PreKeyBundleInfo {
  /** 用户 ID */
  userId: string;
  /** 设备 ID */
  deviceId: number;
  /** 注册 ID */
  registrationId: number;
  /** 身份公钥 (Base64) */
  identityKey: string;
  /** 签名预密钥 ID */
  signedPreKeyId: number;
  /** 签名预密钥 (Base64) */
  signedPreKey: string;
  /** 签名预密钥签名 (Base64) */
  signedPreKeySignature: string;
  /** 一次性预密钥 ID（可选） */
  preKeyId?: number;
  /** 一次性预密钥 (Base64)（可选） */
  preKey?: string;
  /** Kyber 预密钥 ID */
  kyberPreKeyId: number;
  /** Kyber 预密钥 (Base64) */
  kyberPreKey: string;
  /** Kyber 预密钥签名 (Base64) */
  kyberPreKeySignature: string;
}

/**
 * 加密消息
 */
export interface EncryptedMessageData {
  /** 消息类型 */
  type: number;
  /** 发送方设备 ID */
  deviceId: number;
  /** 发送方注册 ID */
  registrationId: number;
  /** 加密内容 (Base64) */
  content: string;
}

/**
 * 生成的密钥信息（首次初始化时返回）
 */
export interface GeneratedKeysInfo {
  /** 身份密钥对 */
  identityKeyPair: {
    publicKey: string;
    privateKey: string;
  };
  /** 注册 ID */
  registrationId: number;
  /** 签名预密钥 */
  signedPreKey: {
    keyId: number;
    publicKey: string;
    privateKey: string;
    signature: string;
    timestamp: number;
  };
  /** 一次性预密钥列表 */
  preKeys: Array<{
    keyId: number;
    publicKey: string;
    privateKey: string;
  }>;
}

/**
 * 加密客户端状态
 */
export type EncryptionClientState = 'uninitialized' | 'initializing' | 'ready' | 'error';

/**
 * 加密客户端
 * 提供端到端加密的统一 API
 */
export class EncryptionClient {
  private readonly config: EncryptionClientConfig;
  private readonly signalStorage: SignalStorageAdapter;
  private state: EncryptionClientState = 'uninitialized';
  private error: Error | null = null;

  // 延迟加载 encryption 模块（避免循环依赖）
  private sessionManager: unknown = null;

  constructor(config: EncryptionClientConfig) {
    this.config = config;
    this.signalStorage = new SignalStorageAdapter(config.storage);
  }

  /**
   * 获取当前状态
   */
  getState(): EncryptionClientState {
    return this.state;
  }

  /**
   * 获取错误信息
   */
  getError(): Error | null {
    return this.error;
  }

  /**
   * 初始化加密客户端
   * @param keys 可选的预生成密钥，如果没有则尝试从存储加载
   * @returns 如果是首次初始化，返回生成的密钥信息
   */
  async initialize(keys?: GeneratedKeysInfo): Promise<GeneratedKeysInfo | null> {
    if (this.state === 'ready') {
      return null;
    }

    if (this.state === 'initializing') {
      throw new Error('Client is already initializing');
    }

    this.state = 'initializing';
    this.error = null;

    try {
      // 动态导入 encryption 模块
      const { createPersistentSessionManager, generateKeys } = await import('@qyra/encryption');

      const manager = createPersistentSessionManager({
        storage: this.signalStorage,
        deviceId: this.config.deviceId,
      });

      let generatedKeys: GeneratedKeysInfo | null = null;

      if (keys) {
        // 使用提供的密钥初始化
        await manager.initialize(keys as any);
      } else {
        // 尝试从存储加载
        try {
          await manager.initialize();
        } catch {
          // 存储中没有密钥，生成新的
          const newKeys = generateKeys();
          await manager.initialize(newKeys);
          generatedKeys = newKeys as GeneratedKeysInfo;
        }
      }

      this.sessionManager = manager;
      this.state = 'ready';

      return generatedKeys;
    } catch (err) {
      this.state = 'error';
      this.error = err instanceof Error ? err : new Error(String(err));
      throw this.error;
    }
  }

  /**
   * 确保已初始化
   */
  private ensureReady(): void {
    if (this.state !== 'ready') {
      throw new Error(`Encryption client not ready. Current state: ${this.state}`);
    }
  }

  /**
   * 获取设备密钥信息
   */
  getDeviceKeyInfo(): DeviceKeyInfo {
    this.ensureReady();
    const manager = this.sessionManager as any;

    return {
      identityKey: manager.getIdentityPublicKey(),
      registrationId: manager.getRegistrationId(),
      deviceId: manager.getDeviceId(),
    };
  }

  /**
   * 获取 Kyber 预密钥信息
   */
  getKyberPreKeyInfo(): { keyId: number; publicKey: string; signature: string } | null {
    this.ensureReady();
    const manager = this.sessionManager as any;
    return manager.getKyberPreKeyInfo();
  }

  /**
   * 使用预密钥包建立会话
   */
  async createSession(bundle: PreKeyBundleInfo): Promise<void> {
    this.ensureReady();
    const manager = this.sessionManager as any;

    await manager.createSession(
      {
        userId: bundle.userId,
        deviceId: bundle.deviceId,
        registrationId: bundle.registrationId,
        identityKey: bundle.identityKey,
        signedPreKeyId: bundle.signedPreKeyId,
        signedPreKey: bundle.signedPreKey,
        signedPreKeySignature: bundle.signedPreKeySignature,
        preKeyId: bundle.preKeyId,
        preKey: bundle.preKey,
      },
      bundle.kyberPreKeyId,
      bundle.kyberPreKey,
      bundle.kyberPreKeySignature
    );
  }

  /**
   * 检查是否已与指定用户建立会话
   */
  async hasSession(userId: string, deviceId: number): Promise<boolean> {
    this.ensureReady();
    const manager = this.sessionManager as any;
    return manager.hasSession(userId, deviceId);
  }

  /**
   * 加密消息
   */
  async encrypt(
    userId: string,
    deviceId: number,
    plaintext: string
  ): Promise<EncryptedMessageData> {
    this.ensureReady();
    const manager = this.sessionManager as any;
    return manager.encrypt(userId, deviceId, plaintext);
  }

  /**
   * 解密消息
   */
  async decrypt(userId: string, deviceId: number, message: EncryptedMessageData): Promise<string> {
    this.ensureReady();
    const manager = this.sessionManager as any;
    return manager.decrypt(userId, deviceId, message);
  }

  /**
   * 删除会话
   */
  async deleteSession(userId: string, deviceId: number): Promise<void> {
    this.ensureReady();
    const manager = this.sessionManager as any;
    await manager.deleteSession(userId, deviceId);
  }

  /**
   * 获取会话状态
   */
  getSessionState(
    userId: string,
    deviceId: number
  ): {
    remoteUserId: string;
    remoteDeviceId: number;
    established: boolean;
    createdAt: number;
    lastActiveAt: number;
  } | null {
    this.ensureReady();
    const manager = this.sessionManager as any;
    return manager.getSessionState(userId, deviceId);
  }

  /**
   * 获取所有会话状态
   */
  getAllSessionStates(): Array<{
    remoteUserId: string;
    remoteDeviceId: number;
    established: boolean;
    createdAt: number;
    lastActiveAt: number;
  }> {
    this.ensureReady();
    const manager = this.sessionManager as any;
    return manager.getAllSessionStates();
  }

  /**
   * 获取底层 Signal 存储适配器
   */
  getSignalStorage(): SignalStorageAdapter {
    return this.signalStorage;
  }

  /**
   * 获取底层存储适配器
   */
  getStorage(): IStorageAdapter {
    return this.config.storage;
  }
}

/**
 * 创建加密客户端
 */
export function createEncryptionClient(config: EncryptionClientConfig): EncryptionClient {
  return new EncryptionClient(config);
}

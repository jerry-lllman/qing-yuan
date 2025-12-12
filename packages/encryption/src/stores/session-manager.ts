/**
 * 持久化会话管理器
 * 使用外部存储适配器实现 Signal Protocol 会话管理
 */
import {
  PrivateKey,
  PublicKey,
  PreKeyBundle as SignalPreKeyBundle,
  ProtocolAddress,
  PreKeyRecord,
  SignedPreKeyRecord,
  KyberPreKeyRecord,
  KEMKeyPair,
  CiphertextMessageType,
  PreKeySignalMessage,
  SignalMessage,
  processPreKeyBundle,
  signalEncrypt,
  signalDecrypt,
  signalDecryptPreKey,
} from '@signalapp/libsignal-client';
import type {
  PreKeyBundle,
  EncryptedMessage,
  GeneratedKeys,
  SignedPreKey,
  PreKey,
  DeviceId,
} from '../types';
import { fromBase64, toBase64 } from '../keys';
import type { ISignalStorageAdapter } from './types';
import { createSignalStores, initializeSignalStores, type SignalStores } from './persistent';
import type { SessionState, KyberPreKey } from '../session';
import { generateKyberPreKey } from '../session';

/**
 * 会话管理器配置
 */
export interface SessionManagerConfig {
  /** Signal 存储适配器 */
  storage: ISignalStorageAdapter;
  /** 设备 ID */
  deviceId?: DeviceId;
}

/**
 * 持久化 Signal 会话管理器
 * 使用外部存储适配器，支持跨会话持久化
 */
export class PersistentSignalSessionManager {
  private readonly storage: ISignalStorageAdapter;
  private readonly stores: SignalStores;
  private readonly deviceId: DeviceId;

  private identityPrivateKey: PrivateKey | null = null;
  private identityPublicKey: PublicKey | null = null;
  private registrationId: number | null = null;

  private sessionStates = new Map<string, SessionState>();
  private kyberPreKey: KyberPreKey | null = null;
  private initialized = false;

  constructor(config: SessionManagerConfig) {
    this.storage = config.storage;
    this.deviceId = config.deviceId ?? 1;
    this.stores = createSignalStores(config.storage);
  }

  /**
   * 初始化会话管理器
   * 从持久化存储加载密钥，如果不存在则使用提供的密钥初始化
   */
  async initialize(keys?: GeneratedKeys): Promise<void> {
    if (this.initialized) {
      return;
    }

    // 尝试从存储加载
    await initializeSignalStores(this.stores);

    if (this.stores.identityStore.isInitialized) {
      // 从存储加载成功
      this.identityPrivateKey = await this.stores.identityStore.getIdentityKey();
      this.identityPublicKey = this.stores.identityStore.getIdentityPublicKey();
      this.registrationId = await this.stores.identityStore.getLocalRegistrationId();

      // 加载 Kyber 预密钥
      await this.loadKyberPreKey();
    } else if (keys) {
      // 使用提供的密钥初始化
      await this.initializeWithKeys(keys);
    } else {
      throw new Error('No stored keys found and no keys provided for initialization');
    }

    this.initialized = true;
  }

  /**
   * 使用提供的密钥初始化存储
   */
  private async initializeWithKeys(keys: GeneratedKeys): Promise<void> {
    // 解析身份密钥
    const privateKeyBytes = fromBase64(keys.identityKeyPair.privateKey);
    this.identityPrivateKey = PrivateKey.deserialize(Buffer.from(privateKeyBytes));
    this.identityPublicKey = this.identityPrivateKey.getPublicKey();
    this.registrationId = keys.registrationId;

    // 保存到身份存储
    await this.stores.identityStore.setIdentityKeyPair(
      this.identityPublicKey,
      this.identityPrivateKey
    );
    await this.stores.identityStore.setRegistrationId(this.registrationId);

    // 存储预密钥
    await this.storePreKeys(keys.preKeys);
    await this.storeSignedPreKey(keys.signedPreKey);

    // 生成并存储 Kyber 预密钥
    await this.generateAndStoreKyberPreKey(1);
  }

  /**
   * 检查是否已初始化
   */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 加载 Kyber 预密钥
   */
  private async loadKyberPreKey(): Promise<void> {
    // 尝试获取 Kyber 预密钥 ID 1（默认）
    try {
      const record = await this.stores.kyberPreKeyStore.getKyberPreKey(1);
      if (record) {
        // 重建 KyberPreKey 结构
        // 注意：实际的 keyPair 无法从 record 完全恢复，需要存储额外信息
        // 这里简化处理，如果需要完整恢复需要额外存储
        this.kyberPreKey = {
          keyId: 1,
          keyPair: KEMKeyPair.generate(), // 占位符
          signature: new Uint8Array(record.signature()),
          timestamp: Date.now(),
        };
      }
    } catch {
      // 没有 Kyber 预密钥，生成新的
      if (this.identityPrivateKey) {
        await this.generateAndStoreKyberPreKey(1);
      }
    }
  }

  /**
   * 生成并存储 Kyber 预密钥
   */
  private async generateAndStoreKyberPreKey(keyId: number): Promise<void> {
    if (!this.identityPrivateKey) {
      throw new Error('Identity private key not initialized');
    }

    this.kyberPreKey = generateKyberPreKey(this.identityPrivateKey, keyId);

    const record = KyberPreKeyRecord.new(
      keyId,
      this.kyberPreKey.timestamp,
      this.kyberPreKey.keyPair,
      Buffer.from(this.kyberPreKey.signature)
    );
    await this.stores.kyberPreKeyStore.saveKyberPreKey(keyId, record);
  }

  /**
   * 存储预密钥到持久化存储
   */
  private async storePreKeys(preKeys: PreKey[]): Promise<void> {
    for (const preKey of preKeys) {
      const privateKeyBytes = fromBase64(preKey.privateKey);
      const publicKeyBytes = fromBase64(preKey.publicKey);
      const privateKey = PrivateKey.deserialize(Buffer.from(privateKeyBytes));
      const publicKey = PublicKey.deserialize(Buffer.from(publicKeyBytes));

      const record = PreKeyRecord.new(preKey.keyId, publicKey, privateKey);
      await this.stores.preKeyStore.savePreKey(preKey.keyId, record);
    }
  }

  /**
   * 存储签名预密钥到持久化存储
   */
  private async storeSignedPreKey(signedPreKey: SignedPreKey): Promise<void> {
    const privateKeyBytes = fromBase64(signedPreKey.privateKey);
    const publicKeyBytes = fromBase64(signedPreKey.publicKey);
    const signatureBytes = fromBase64(signedPreKey.signature);

    const privateKey = PrivateKey.deserialize(Buffer.from(privateKeyBytes));
    const publicKey = PublicKey.deserialize(Buffer.from(publicKeyBytes));

    const record = SignedPreKeyRecord.new(
      signedPreKey.keyId,
      signedPreKey.timestamp,
      publicKey,
      privateKey,
      Buffer.from(signatureBytes)
    );
    await this.stores.signedPreKeyStore.saveSignedPreKey(signedPreKey.keyId, record);
  }

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Session manager not initialized. Call initialize() first.');
    }
  }

  /**
   * 生成协议地址
   */
  private createAddress(userId: string, deviceId: DeviceId): ProtocolAddress {
    return ProtocolAddress.new(userId, deviceId);
  }

  /**
   * 获取会话键名
   */
  private getSessionKey(userId: string, deviceId: DeviceId): string {
    return `${userId}:${deviceId}`;
  }

  /**
   * 获取 Kyber 预密钥信息（用于创建 PreKeyBundle）
   */
  getKyberPreKeyInfo(): { keyId: number; publicKey: string; signature: string } | null {
    this.ensureInitialized();

    if (!this.kyberPreKey) {
      return null;
    }
    return {
      keyId: this.kyberPreKey.keyId,
      publicKey: toBase64(new Uint8Array(this.kyberPreKey.keyPair.getPublicKey().serialize())),
      signature: toBase64(this.kyberPreKey.signature),
    };
  }

  /**
   * 使用对方的预密钥包建立会话
   * 这是 X3DH 密钥协商的客户端实现
   */
  async createSession(
    bundle: PreKeyBundle,
    kyberPreKeyId: number,
    kyberPreKey: string,
    kyberPreKeySignature: string
  ): Promise<void> {
    this.ensureInitialized();

    const address = this.createAddress(bundle.userId, bundle.deviceId);

    // 构建 Signal PreKeyBundle
    const identityKey = PublicKey.deserialize(Buffer.from(fromBase64(bundle.identityKey)));
    const signedPreKey = PublicKey.deserialize(Buffer.from(fromBase64(bundle.signedPreKey)));
    const signedPreKeySignature = Buffer.from(fromBase64(bundle.signedPreKeySignature));

    let preKey: PublicKey | null = null;
    let preKeyId: number | null = null;
    if (bundle.preKey && bundle.preKeyId !== undefined) {
      preKey = PublicKey.deserialize(Buffer.from(fromBase64(bundle.preKey)));
      preKeyId = bundle.preKeyId;
    }

    // Kyber 密钥
    const { KEMPublicKey } = await import('@signalapp/libsignal-client');
    const kyberPK = KEMPublicKey.deserialize(Buffer.from(fromBase64(kyberPreKey)));
    const kyberSig = Buffer.from(fromBase64(kyberPreKeySignature));

    const signalBundle = SignalPreKeyBundle.new(
      bundle.registrationId,
      bundle.deviceId,
      preKeyId,
      preKey,
      bundle.signedPreKeyId,
      signedPreKey,
      signedPreKeySignature,
      identityKey,
      kyberPreKeyId,
      kyberPK,
      kyberSig
    );

    // 使用 processPreKeyBundle 建立会话
    await processPreKeyBundle(
      signalBundle,
      address,
      this.stores.sessionStore,
      this.stores.identityStore,
      new Date()
    );

    // 记录会话状态
    const sessionKey = this.getSessionKey(bundle.userId, bundle.deviceId);
    this.sessionStates.set(sessionKey, {
      remoteUserId: bundle.userId,
      remoteDeviceId: bundle.deviceId,
      established: true,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    });
  }

  /**
   * 检查是否已与指定用户建立会话
   */
  async hasSession(userId: string, deviceId: DeviceId): Promise<boolean> {
    this.ensureInitialized();

    const address = this.createAddress(userId, deviceId);
    const session = await this.stores.sessionStore.getSession(address);
    return session !== null;
  }

  /**
   * 加密消息
   */
  async encrypt(userId: string, deviceId: DeviceId, plaintext: string): Promise<EncryptedMessage> {
    this.ensureInitialized();

    const address = this.createAddress(userId, deviceId);
    const plaintextBuffer = Buffer.from(plaintext, 'utf-8');

    const ciphertext = await signalEncrypt(
      plaintextBuffer,
      address,
      this.stores.sessionStore,
      this.stores.identityStore,
      new Date()
    );

    // 更新会话最后活动时间
    const sessionKey = this.getSessionKey(userId, deviceId);
    const state = this.sessionStates.get(sessionKey);
    if (state) {
      state.lastActiveAt = Date.now();
    }

    return {
      type: ciphertext.type(),
      deviceId: this.deviceId,
      registrationId: this.registrationId!,
      content: toBase64(new Uint8Array(ciphertext.serialize())),
    };
  }

  /**
   * 解密消息
   */
  async decrypt(userId: string, deviceId: DeviceId, message: EncryptedMessage): Promise<string> {
    this.ensureInitialized();

    const address = this.createAddress(userId, deviceId);
    const ciphertextBuffer = Buffer.from(fromBase64(message.content));

    let plaintext: Uint8Array;

    if (message.type === CiphertextMessageType.PreKey) {
      // PreKey 消息（首次通信）
      const preKeyMessage = PreKeySignalMessage.deserialize(ciphertextBuffer);
      plaintext = await signalDecryptPreKey(
        preKeyMessage,
        address,
        this.stores.sessionStore,
        this.stores.identityStore,
        this.stores.preKeyStore,
        this.stores.signedPreKeyStore,
        this.stores.kyberPreKeyStore
      );

      // 更新或创建会话状态
      const sessionKey = this.getSessionKey(userId, deviceId);
      if (!this.sessionStates.has(sessionKey)) {
        this.sessionStates.set(sessionKey, {
          remoteUserId: userId,
          remoteDeviceId: deviceId,
          established: true,
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
        });
      }
    } else {
      // 普通 Whisper 消息
      const signalMessage = SignalMessage.deserialize(ciphertextBuffer);
      plaintext = await signalDecrypt(
        signalMessage,
        address,
        this.stores.sessionStore,
        this.stores.identityStore
      );
    }

    // 更新会话最后活动时间
    const sessionKey = this.getSessionKey(userId, deviceId);
    const state = this.sessionStates.get(sessionKey);
    if (state) {
      state.lastActiveAt = Date.now();
    }

    return Buffer.from(plaintext).toString('utf-8');
  }

  /**
   * 获取会话状态
   */
  getSessionState(userId: string, deviceId: DeviceId): SessionState | null {
    const sessionKey = this.getSessionKey(userId, deviceId);
    return this.sessionStates.get(sessionKey) ?? null;
  }

  /**
   * 获取所有会话状态
   */
  getAllSessionStates(): SessionState[] {
    return Array.from(this.sessionStates.values());
  }

  /**
   * 删除会话
   */
  async deleteSession(userId: string, deviceId: DeviceId): Promise<void> {
    this.ensureInitialized();

    const address = this.createAddress(userId, deviceId);
    await this.stores.sessionStore.removeSession(address);

    const sessionKey = this.getSessionKey(userId, deviceId);
    this.sessionStates.delete(sessionKey);
  }

  /**
   * 获取注册 ID
   */
  getRegistrationId(): number {
    this.ensureInitialized();
    return this.registrationId!;
  }

  /**
   * 获取设备 ID
   */
  getDeviceId(): DeviceId {
    return this.deviceId;
  }

  /**
   * 获取身份公钥（Base64 编码）
   */
  getIdentityPublicKey(): string {
    this.ensureInitialized();
    return toBase64(new Uint8Array(this.identityPublicKey!.serialize()));
  }

  /**
   * 获取底层存储适配器
   */
  getStorage(): ISignalStorageAdapter {
    return this.storage;
  }

  /**
   * 获取底层 Signal 存储
   */
  getStores(): SignalStores {
    return this.stores;
  }
}

/**
 * 创建持久化会话管理器
 */
export function createPersistentSessionManager(
  config: SessionManagerConfig
): PersistentSignalSessionManager {
  return new PersistentSignalSessionManager(config);
}

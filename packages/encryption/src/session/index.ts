/**
 * 会话管理模块
 * 实现 X3DH 密钥协商和 Double Ratchet 会话管理
 *
 * 注意：Signal Protocol 最新版本需要 Kyber（后量子）密钥支持
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
  SessionRecord,
  SessionStore,
  IdentityKeyStore,
  IdentityChange,
  PreKeyStore,
  SignedPreKeyStore,
  KyberPreKeyStore,
  CiphertextMessageType,
  PreKeySignalMessage,
  SignalMessage,
  processPreKeyBundle,
  signalEncrypt,
  signalDecrypt,
  signalDecryptPreKey,
  Direction,
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

/**
 * 会话状态
 */
export interface SessionState {
  /** 对方用户 ID */
  remoteUserId: string;
  /** 对方设备 ID */
  remoteDeviceId: DeviceId;
  /** 会话是否已建立 */
  established: boolean;
  /** 创建时间 */
  createdAt: number;
  /** 最后活动时间 */
  lastActiveAt: number;
}

/**
 * 内存身份密钥存储
 */
class InMemoryIdentityKeyStore extends IdentityKeyStore {
  private identityKeyPair: { publicKey: PublicKey; privateKey: PrivateKey };
  private registrationId: number;
  private trustedIdentities = new Map<string, Uint8Array>();

  constructor(publicKey: PublicKey, privateKey: PrivateKey, registrationId: number) {
    super();
    this.identityKeyPair = { publicKey, privateKey };
    this.registrationId = registrationId;
  }

  async getIdentityKey(): Promise<PrivateKey> {
    return this.identityKeyPair.privateKey;
  }

  async getLocalRegistrationId(): Promise<number> {
    return this.registrationId;
  }

  async saveIdentity(name: ProtocolAddress, key: PublicKey): Promise<IdentityChange> {
    const existingKey = this.trustedIdentities.get(name.toString());
    const newKeyBytes = key.serialize();

    if (existingKey) {
      const changed = !this.arraysEqual(existingKey, newKeyBytes);
      this.trustedIdentities.set(name.toString(), newKeyBytes);
      return changed ? IdentityChange.ReplacedExisting : IdentityChange.NewOrUnchanged;
    }

    this.trustedIdentities.set(name.toString(), newKeyBytes);
    return IdentityChange.NewOrUnchanged;
  }

  async isTrustedIdentity(
    name: ProtocolAddress,
    key: PublicKey,
    _direction: Direction
  ): Promise<boolean> {
    const existingKey = this.trustedIdentities.get(name.toString());
    if (!existingKey) {
      return true; // 首次见到的身份默认信任
    }
    return this.arraysEqual(existingKey, key.serialize());
  }

  async getIdentity(name: ProtocolAddress): Promise<PublicKey | null> {
    const keyBytes = this.trustedIdentities.get(name.toString());
    if (!keyBytes) {
      return null;
    }
    return PublicKey.deserialize(Buffer.from(keyBytes));
  }

  private arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}

/**
 * 内存会话存储
 */
class InMemorySessionStore extends SessionStore {
  private sessions = new Map<string, Uint8Array>();

  async saveSession(name: ProtocolAddress, record: SessionRecord): Promise<void> {
    this.sessions.set(name.toString(), record.serialize());
  }

  async getSession(name: ProtocolAddress): Promise<SessionRecord | null> {
    const data = this.sessions.get(name.toString());
    if (!data) {
      return null;
    }
    return SessionRecord.deserialize(Buffer.from(data));
  }

  async getExistingSessions(addresses: ProtocolAddress[]): Promise<SessionRecord[]> {
    const records: SessionRecord[] = [];
    for (const address of addresses) {
      const session = await this.getSession(address);
      if (session) {
        records.push(session);
      }
    }
    return records;
  }
}

/**
 * 内存预密钥存储
 */
class InMemoryPreKeyStore extends PreKeyStore {
  private preKeys = new Map<number, Uint8Array>();

  async savePreKey(id: number, record: PreKeyRecord): Promise<void> {
    this.preKeys.set(id, record.serialize());
  }

  async getPreKey(id: number): Promise<PreKeyRecord> {
    const data = this.preKeys.get(id);
    if (!data) {
      throw new Error(`PreKey ${id} not found`);
    }
    return PreKeyRecord.deserialize(Buffer.from(data));
  }

  async removePreKey(id: number): Promise<void> {
    this.preKeys.delete(id);
  }
}

/**
 * 内存签名预密钥存储
 */
class InMemorySignedPreKeyStore extends SignedPreKeyStore {
  private signedPreKeys = new Map<number, Uint8Array>();

  async saveSignedPreKey(id: number, record: SignedPreKeyRecord): Promise<void> {
    this.signedPreKeys.set(id, record.serialize());
  }

  async getSignedPreKey(id: number): Promise<SignedPreKeyRecord> {
    const data = this.signedPreKeys.get(id);
    if (!data) {
      throw new Error(`SignedPreKey ${id} not found`);
    }
    return SignedPreKeyRecord.deserialize(Buffer.from(data));
  }
}

/**
 * 内存 Kyber 预密钥存储
 */
class InMemoryKyberPreKeyStore extends KyberPreKeyStore {
  private kyberPreKeys = new Map<number, Uint8Array>();

  async saveKyberPreKey(id: number, record: KyberPreKeyRecord): Promise<void> {
    this.kyberPreKeys.set(id, record.serialize());
  }

  async getKyberPreKey(id: number): Promise<KyberPreKeyRecord> {
    const data = this.kyberPreKeys.get(id);
    if (!data) {
      throw new Error(`KyberPreKey ${id} not found`);
    }
    return KyberPreKeyRecord.deserialize(Buffer.from(data));
  }

  async markKyberPreKeyUsed(_id: number): Promise<void> {
    // 可以选择在这里删除已使用的 Kyber 预密钥
    // 或者只是标记为已使用
  }
}

/**
 * Kyber 预密钥信息
 */
export interface KyberPreKey {
  keyId: number;
  keyPair: KEMKeyPair;
  signature: Uint8Array;
  timestamp: number;
}

/**
 * 生成 Kyber 预密钥（后量子加密）
 */
export function generateKyberPreKey(identityPrivateKey: PrivateKey, keyId: number): KyberPreKey {
  const keyPair = KEMKeyPair.generate();
  const publicKeyBytes = keyPair.getPublicKey().serialize();
  const signature = identityPrivateKey.sign(Buffer.from(publicKeyBytes));

  return {
    keyId,
    keyPair,
    signature: new Uint8Array(signature),
    timestamp: Date.now(),
  };
}

/**
 * Signal 会话管理器
 * 管理与其他用户的加密会话
 */
export class SignalSessionManager {
  private identityPrivateKey: PrivateKey;
  private identityPublicKey: PublicKey;
  private registrationId: number;
  private deviceId: DeviceId;

  private identityStore: InMemoryIdentityKeyStore;
  private preKeyStore: InMemoryPreKeyStore;
  private signedPreKeyStore: InMemorySignedPreKeyStore;
  private kyberPreKeyStore: InMemoryKyberPreKeyStore;
  private sessionStore: InMemorySessionStore;

  private sessionStates = new Map<string, SessionState>();
  private kyberPreKey: KyberPreKey | null = null;

  constructor(keys: GeneratedKeys, deviceId: DeviceId = 1) {
    // 从生成的密钥创建 Signal 密钥对
    const privateKeyBytes = fromBase64(keys.identityKeyPair.privateKey);
    this.identityPrivateKey = PrivateKey.deserialize(Buffer.from(privateKeyBytes));
    this.identityPublicKey = this.identityPrivateKey.getPublicKey();

    this.registrationId = keys.registrationId;
    this.deviceId = deviceId;

    // 初始化存储
    this.identityStore = new InMemoryIdentityKeyStore(
      this.identityPublicKey,
      this.identityPrivateKey,
      this.registrationId
    );
    this.preKeyStore = new InMemoryPreKeyStore();
    this.signedPreKeyStore = new InMemorySignedPreKeyStore();
    this.kyberPreKeyStore = new InMemoryKyberPreKeyStore();
    this.sessionStore = new InMemorySessionStore();

    // 存储预密钥
    this.storePreKeys(keys.preKeys);
    this.storeSignedPreKey(keys.signedPreKey);

    // 生成并存储 Kyber 预密钥
    this.generateAndStoreKyberPreKey(1);
  }

  /**
   * 生成并存储 Kyber 预密钥
   */
  private generateAndStoreKyberPreKey(keyId: number): void {
    this.kyberPreKey = generateKyberPreKey(this.identityPrivateKey, keyId);

    const record = KyberPreKeyRecord.new(
      keyId,
      this.kyberPreKey.timestamp,
      this.kyberPreKey.keyPair,
      Buffer.from(this.kyberPreKey.signature)
    );
    this.kyberPreKeyStore.saveKyberPreKey(keyId, record);
  }

  /**
   * 存储预密钥到本地存储
   */
  private storePreKeys(preKeys: PreKey[]): void {
    for (const preKey of preKeys) {
      const privateKeyBytes = fromBase64(preKey.privateKey);
      const publicKeyBytes = fromBase64(preKey.publicKey);
      const privateKey = PrivateKey.deserialize(Buffer.from(privateKeyBytes));
      const publicKey = PublicKey.deserialize(Buffer.from(publicKeyBytes));

      const record = PreKeyRecord.new(preKey.keyId, publicKey, privateKey);
      this.preKeyStore.savePreKey(preKey.keyId, record);
    }
  }

  /**
   * 存储签名预密钥到本地存储
   */
  private storeSignedPreKey(signedPreKey: SignedPreKey): void {
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
    this.signedPreKeyStore.saveSignedPreKey(signedPreKey.keyId, record);
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
   *
   * 注意：新版 Signal Protocol 需要 Kyber 密钥
   */
  async createSession(
    bundle: PreKeyBundle,
    kyberPreKeyId: number,
    kyberPreKey: string,
    kyberPreKeySignature: string
  ): Promise<void> {
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
      this.sessionStore,
      this.identityStore,
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
    const address = this.createAddress(userId, deviceId);
    const session = await this.sessionStore.getSession(address);
    return session !== null;
  }

  /**
   * 加密消息
   */
  async encrypt(userId: string, deviceId: DeviceId, plaintext: string): Promise<EncryptedMessage> {
    const address = this.createAddress(userId, deviceId);
    const plaintextBuffer = Buffer.from(plaintext, 'utf-8');

    const ciphertext = await signalEncrypt(
      plaintextBuffer,
      address,
      this.sessionStore,
      this.identityStore,
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
      registrationId: this.registrationId,
      content: toBase64(new Uint8Array(ciphertext.serialize())),
    };
  }

  /**
   * 解密消息
   */
  async decrypt(userId: string, deviceId: DeviceId, message: EncryptedMessage): Promise<string> {
    const address = this.createAddress(userId, deviceId);
    const ciphertextBuffer = Buffer.from(fromBase64(message.content));

    let plaintext: Uint8Array;

    if (message.type === CiphertextMessageType.PreKey) {
      // PreKey 消息（首次通信）
      const preKeyMessage = PreKeySignalMessage.deserialize(ciphertextBuffer);
      plaintext = await signalDecryptPreKey(
        preKeyMessage,
        address,
        this.sessionStore,
        this.identityStore,
        this.preKeyStore,
        this.signedPreKeyStore,
        this.kyberPreKeyStore
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
        this.sessionStore,
        this.identityStore
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
    const sessionKey = this.getSessionKey(userId, deviceId);
    this.sessionStates.delete(sessionKey);
  }

  /**
   * 获取注册 ID
   */
  getRegistrationId(): number {
    return this.registrationId;
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
    return toBase64(new Uint8Array(this.identityPublicKey.serialize()));
  }
}

/**
 * 创建会话管理器
 */
export function createSessionManager(
  keys: GeneratedKeys,
  deviceId: DeviceId = 1
): SignalSessionManager {
  return new SignalSessionManager(keys, deviceId);
}

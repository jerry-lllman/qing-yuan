import { ISignalStorageAdapter, IStorageAdapter } from './types';

/**
 * Signal Key 前缀常量
 */
const SIGNAL_KEYS = {
  IDENTITY_KEY_PAIR: 'identity:keypair',
  REGISTRATION_ID: 'identity:registrationId',
  REMOTE_IDENTITY: 'identity:remote:', // + address
  SESSION: 'session:', // + address
  PRE_KEY: 'prekey:', // + keyId
  SIGNED_PRE_KEY: 'signedPrekey:', // + keyId
  KYBER_PRE_KEY: 'kyberPrekey:', // + keyId
  KYBER_PRE_KEY_USED: 'kyberPrekeyUsed:', // + keyId
} as const;

export class SignalStorageAdapter implements ISignalStorageAdapter {
  constructor(private storage: IStorageAdapter) {}

  // ======================
  // Identity Key
  // ======================

  async getIdentityKeyPair(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array } | null> {
    const publicKey = await this.storage.getBytes(`${SIGNAL_KEYS.IDENTITY_KEY_PAIR}:public`);
    const privateKey = await this.storage.getBytes(`${SIGNAL_KEYS.IDENTITY_KEY_PAIR}:private`);

    if (!publicKey || !privateKey) {
      return null;
    }

    return { publicKey, privateKey };
  }

  async saveIdentityKeyPair(publicKey: Uint8Array, privateKey: Uint8Array): Promise<void> {
    await this.storage.setBytes(`${SIGNAL_KEYS.IDENTITY_KEY_PAIR}:public`, publicKey);
    await this.storage.setBytes(`${SIGNAL_KEYS.IDENTITY_KEY_PAIR}:private`, privateKey);
  }

  async getLocalRegistrationId(): Promise<number | null> {
    return this.storage.get<number>(SIGNAL_KEYS.REGISTRATION_ID);
  }

  async saveLocalRegistrationId(id: number): Promise<void> {
    await this.storage.set<number>(SIGNAL_KEYS.REGISTRATION_ID, id);
  }

  // ======================
  // Remote Identity
  // ======================

  async getRemoteIdentity(address: string): Promise<Uint8Array | null> {
    return this.storage.get<Uint8Array>(`${SIGNAL_KEYS.REMOTE_IDENTITY}${address}`);
  }

  async saveRemoteIdentity(address: string, identityKey: Uint8Array): Promise<void> {
    await this.storage.set<Uint8Array>(`${SIGNAL_KEYS.REMOTE_IDENTITY}${address}`, identityKey);
  }

  // ======================
  // Session
  // ======================

  async getSession(address: string): Promise<Uint8Array | null> {
    return this.storage.get<Uint8Array>(`${SIGNAL_KEYS.SESSION}${address}`);
  }

  async saveSession(address: string, sessionRecord: Uint8Array): Promise<void> {
    await this.storage.set<Uint8Array>(`${SIGNAL_KEYS.SESSION}${address}`, sessionRecord);
  }

  async removeSession(address: string): Promise<void> {
    await this.storage.remove(`${SIGNAL_KEYS.SESSION}${address}`);
  }

  async getAllSessionAddresses(): Promise<string[]> {
    const keys = await this.storage.keys(SIGNAL_KEYS.SESSION);
    return keys.map((key) => key.slice(SIGNAL_KEYS.SESSION.length));
  }

  // ======================
  // PreKey
  // ======================

  async getPreKey(keyId: number): Promise<Uint8Array | null> {
    return this.storage.get<Uint8Array>(`${SIGNAL_KEYS.PRE_KEY}${keyId}`);
  }

  async savePreKey(keyId: number, preKeyRecord: Uint8Array): Promise<void> {
    await this.storage.set<Uint8Array>(`${SIGNAL_KEYS.PRE_KEY}${keyId}`, preKeyRecord);
  }

  async removePreKey(keyId: number): Promise<void> {
    await this.storage.remove(`${SIGNAL_KEYS.PRE_KEY}${keyId}`);
  }

  async getAllPreKeyIds(): Promise<number[]> {
    const keys = await this.storage.keys(SIGNAL_KEYS.PRE_KEY);
    // return keys.map((k) => parseInt(k.replace(SIGNAL_KEYS.PRE_KEY, ''), 10));
    return keys.map((key) => parseInt(key.slice(SIGNAL_KEYS.PRE_KEY.length), 10));
  }

  // ======================
  // Signed PreKey
  // ======================

  async getSignedPreKey(id: number): Promise<Uint8Array | null> {
    return this.storage.get<Uint8Array>(`${SIGNAL_KEYS.SIGNED_PRE_KEY}${id}`);
  }

  async saveSignedPreKey(id: number, record: Uint8Array): Promise<void> {
    await this.storage.set<Uint8Array>(`${SIGNAL_KEYS.SIGNED_PRE_KEY}${id}`, record);
  }

  async removeSignedPreKey(id: number): Promise<void> {
    await this.storage.remove(`${SIGNAL_KEYS.SIGNED_PRE_KEY}${id}`);
  }

  // ======================
  // Kyber PreKey
  // ======================

  async getKyberPreKey(id: number): Promise<Uint8Array | null> {
    return this.storage.get<Uint8Array>(`${SIGNAL_KEYS.KYBER_PRE_KEY}${id}`);
  }

  async saveKyberPreKey(id: number, record: Uint8Array): Promise<void> {
    await this.storage.set<Uint8Array>(`${SIGNAL_KEYS.KYBER_PRE_KEY}${id}`, record);
  }

  async markKyberPreKeyUsed(id: number): Promise<void> {
    await this.storage.set(`${SIGNAL_KEYS.KYBER_PRE_KEY_USED}${id}`, true);
  }
}

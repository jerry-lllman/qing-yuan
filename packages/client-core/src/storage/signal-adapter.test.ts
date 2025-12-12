import { describe, it, expect, beforeEach } from 'vitest';
import { SignalStorageAdapter } from './signal-adapter';
import { MemoryStorageAdapter } from './adapters/memory';

describe('SignalStorageAdapter', () => {
  let signalAdapter: SignalStorageAdapter;
  let storageAdapter: MemoryStorageAdapter;

  beforeEach(async () => {
    storageAdapter = new MemoryStorageAdapter({ namespace: 'encryption' });
    await storageAdapter.init();
    signalAdapter = new SignalStorageAdapter(storageAdapter);
  });

  describe('Identity Key operations', () => {
    it('should save and retrieve identity key pair', async () => {
      const publicKey = new Uint8Array([1, 2, 3, 4, 5]);
      const privateKey = new Uint8Array([6, 7, 8, 9, 10]);

      await signalAdapter.saveIdentityKeyPair(publicKey, privateKey);
      const result = await signalAdapter.getIdentityKeyPair();

      expect(result).not.toBeNull();
      expect(result!.publicKey).toEqual(publicKey);
      expect(result!.privateKey).toEqual(privateKey);
    });

    it('should return null when no identity key pair exists', async () => {
      const result = await signalAdapter.getIdentityKeyPair();
      expect(result).toBeNull();
    });

    it('should save and retrieve registration ID', async () => {
      await signalAdapter.saveLocalRegistrationId(12345);
      const result = await signalAdapter.getLocalRegistrationId();
      expect(result).toBe(12345);
    });

    it('should return null when no registration ID exists', async () => {
      const result = await signalAdapter.getLocalRegistrationId();
      expect(result).toBeNull();
    });
  });

  describe('Remote Identity operations', () => {
    it('should save and retrieve remote identity', async () => {
      const identityKey = new Uint8Array([1, 2, 3, 4, 5]);
      const address = 'user123.1';

      await signalAdapter.saveRemoteIdentity(address, identityKey);
      const result = await signalAdapter.getRemoteIdentity(address);

      expect(result).toEqual(identityKey);
    });

    it('should return null for non-existent remote identity', async () => {
      const result = await signalAdapter.getRemoteIdentity('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('Session operations', () => {
    it('should save and retrieve session', async () => {
      const sessionRecord = new Uint8Array([10, 20, 30, 40, 50]);
      const address = 'user456.1';

      await signalAdapter.saveSession(address, sessionRecord);
      const result = await signalAdapter.getSession(address);

      expect(result).toEqual(sessionRecord);
    });

    it('should remove session', async () => {
      const address = 'user789.1';
      await signalAdapter.saveSession(address, new Uint8Array([1, 2, 3]));
      await signalAdapter.removeSession(address);

      const result = await signalAdapter.getSession(address);
      expect(result).toBeNull();
    });

    it('should get all session addresses', async () => {
      await signalAdapter.saveSession('user1.1', new Uint8Array([1]));
      await signalAdapter.saveSession('user2.1', new Uint8Array([2]));
      await signalAdapter.saveSession('user3.2', new Uint8Array([3]));

      const addresses = await signalAdapter.getAllSessionAddresses();

      expect(addresses).toHaveLength(3);
      expect(addresses).toContain('user1.1');
      expect(addresses).toContain('user2.1');
      expect(addresses).toContain('user3.2');
    });
  });

  describe('PreKey operations', () => {
    it('should save and retrieve prekey', async () => {
      const preKeyRecord = new Uint8Array([100, 101, 102]);
      const keyId = 1;

      await signalAdapter.savePreKey(keyId, preKeyRecord);
      const result = await signalAdapter.getPreKey(keyId);

      expect(result).toEqual(preKeyRecord);
    });

    it('should remove prekey', async () => {
      const keyId = 2;
      await signalAdapter.savePreKey(keyId, new Uint8Array([1, 2, 3]));
      await signalAdapter.removePreKey(keyId);

      const result = await signalAdapter.getPreKey(keyId);
      expect(result).toBeNull();
    });

    it('should get all prekey IDs', async () => {
      await signalAdapter.savePreKey(1, new Uint8Array([1]));
      await signalAdapter.savePreKey(5, new Uint8Array([2]));
      await signalAdapter.savePreKey(10, new Uint8Array([3]));

      const ids = await signalAdapter.getAllPreKeyIds();

      expect(ids).toHaveLength(3);
      expect(ids).toContain(1);
      expect(ids).toContain(5);
      expect(ids).toContain(10);
    });
  });

  describe('Signed PreKey operations', () => {
    it('should save and retrieve signed prekey', async () => {
      const record = new Uint8Array([200, 201, 202]);
      const keyId = 1;

      await signalAdapter.saveSignedPreKey(keyId, record);
      const result = await signalAdapter.getSignedPreKey(keyId);

      expect(result).toEqual(record);
    });

    it('should remove signed prekey', async () => {
      const keyId = 2;
      await signalAdapter.saveSignedPreKey(keyId, new Uint8Array([1, 2, 3]));
      await signalAdapter.removeSignedPreKey(keyId);

      const result = await signalAdapter.getSignedPreKey(keyId);
      expect(result).toBeNull();
    });
  });

  describe('Kyber PreKey operations', () => {
    it('should save and retrieve kyber prekey', async () => {
      const record = new Uint8Array([50, 51, 52, 53]);
      const keyId = 1;

      await signalAdapter.saveKyberPreKey(keyId, record);
      const result = await signalAdapter.getKyberPreKey(keyId);

      expect(result).toEqual(record);
    });

    it('should mark kyber prekey as used', async () => {
      const keyId = 5;
      await signalAdapter.saveKyberPreKey(keyId, new Uint8Array([1]));

      // Should not throw
      await expect(signalAdapter.markKyberPreKeyUsed(keyId)).resolves.toBeUndefined();
    });
  });
});

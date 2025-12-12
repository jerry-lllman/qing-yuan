import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { describe, it, beforeAll, afterAll, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('KeyController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // 测试用户数据
  const testUser = {
    username: 'keyuser',
    email: 'keyuser@example.com',
    password: 'Test123456',
    nickname: '密钥测试用户',
  };

  const testUser2 = {
    username: 'keyuser2',
    email: 'keyuser2@example.com',
    password: 'Test123456',
    nickname: '密钥测试用户2',
  };

  // 存储 token 和用户 ID
  let accessToken: string;
  let userId: string;
  let accessToken2: string;
  let userId2: string;

  // 模拟密钥数据（Base64 编码的随机字节）
  const mockKeys = {
    registrationId: 12345,
    identityKey: Buffer.from('mock-identity-key-32-bytes-long!').toString(
      'base64',
    ),
    signedPreKeyId: 1,
    signedPreKey: Buffer.from('mock-signed-pre-key-32-bytes!!!').toString(
      'base64',
    ),
    signedPreKeySignature: Buffer.from(
      'mock-signature-64-bytes-long!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    ).toString('base64'),
    kyberPreKeyId: 1,
    kyberPreKey: Buffer.from(
      'mock-kyber-pre-key-1568-bytes-' + 'x'.repeat(1538),
    ).toString('base64'),
    kyberPreKeySignature: Buffer.from(
      'mock-kyber-signature-64-bytes!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    ).toString('base64'),
    preKeys: [
      {
        keyId: 1,
        publicKey: Buffer.from('mock-pre-key-1-32-bytes-long!!!').toString(
          'base64',
        ),
      },
      {
        keyId: 2,
        publicKey: Buffer.from('mock-pre-key-2-32-bytes-long!!!').toString(
          'base64',
        ),
      },
      {
        keyId: 3,
        publicKey: Buffer.from('mock-pre-key-3-32-bytes-long!!!').toString(
          'base64',
        ),
      },
    ],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 应用全局验证管道
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    // 清理测试用户相关数据
    for (const user of [testUser, testUser2]) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ username: user.username }, { email: user.email }],
        },
      });
      if (existingUser) {
        // 先删除关联数据
        await prisma.userIdentityKey.deleteMany({
          where: { userId: existingUser.id },
        });
        await prisma.refreshToken.deleteMany({
          where: { userId: existingUser.id },
        });
        await prisma.userSettings.deleteMany({
          where: { userId: existingUser.id },
        });
        await prisma.user.delete({ where: { id: existingUser.id } });
      }
    }

    // 注册测试用户 1
    const response1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser);
    accessToken = response1.body.accessToken;
    userId = response1.body.user.id;

    // 注册测试用户 2
    const response2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser2);
    accessToken2 = response2.body.accessToken;
    userId2 = response2.body.user.id;
  });

  afterAll(async () => {
    // 清理测试数据
    for (const user of [testUser, testUser2]) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ username: user.username }, { email: user.email }],
        },
      });
      if (existingUser) {
        await prisma.userIdentityKey.deleteMany({
          where: { userId: existingUser.id },
        });
        await prisma.refreshToken.deleteMany({
          where: { userId: existingUser.id },
        });
        await prisma.userSettings.deleteMany({
          where: { userId: existingUser.id },
        });
        await prisma.user.delete({ where: { id: existingUser.id } });
      }
    }
    await app.close();
  });

  describe('POST /keys/upload', () => {
    it('should upload keys successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/keys/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(mockKeys)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('密钥上传成功');
    });

    it('should update keys on re-upload', async () => {
      // 首次上传
      await request(app.getHttpServer())
        .post('/keys/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(mockKeys)
        .expect(200);

      // 更新密钥
      const updatedKeys = {
        ...mockKeys,
        registrationId: 54321,
        signedPreKeyId: 2,
      };

      const response = await request(app.getHttpServer())
        .post('/keys/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updatedKeys)
        .expect(200);

      expect(response.body.message).toBe('密钥上传成功');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/keys/upload')
        .send(mockKeys)
        .expect(401);
    });

    it('should fail with invalid data', async () => {
      await request(app.getHttpServer())
        .post('/keys/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          registrationId: 'not-a-number', // 无效
        })
        .expect(400);
    });
  });

  describe('GET /keys/status', () => {
    it('should return hasKeys: false when no keys uploaded', async () => {
      const response = await request(app.getHttpServer())
        .get('/keys/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('hasKeys', false);
      expect(response.body).toHaveProperty('preKeyCount', 0);
    });

    it('should return correct status after upload', async () => {
      // 上传密钥
      await request(app.getHttpServer())
        .post('/keys/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(mockKeys)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/keys/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('hasKeys', true);
      expect(response.body).toHaveProperty('preKeyCount', 3);
      expect(response.body).toHaveProperty('signedPreKeyUpdatedAt');
    });
  });

  describe('POST /keys/prekeys', () => {
    it('should replenish prekeys successfully', async () => {
      // 先上传密钥
      await request(app.getHttpServer())
        .post('/keys/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(mockKeys)
        .expect(200);

      // 补充预密钥
      const newPreKeys = {
        preKeys: [
          {
            keyId: 10,
            publicKey: Buffer.from('mock-pre-key-10-32-bytes-long!!').toString(
              'base64',
            ),
          },
          {
            keyId: 11,
            publicKey: Buffer.from('mock-pre-key-11-32-bytes-long!!').toString(
              'base64',
            ),
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/keys/prekeys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newPreKeys)
        .expect(200);

      expect(response.body.message).toBe('预密钥补充成功');

      // 验证预密钥数量增加
      const statusResponse = await request(app.getHttpServer())
        .get('/keys/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body.preKeyCount).toBe(5); // 3 + 2
    });

    it('should fail without initial keys', async () => {
      const newPreKeys = {
        preKeys: [
          {
            keyId: 10,
            publicKey: Buffer.from('mock-pre-key-10-32-bytes-long!!').toString(
              'base64',
            ),
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/keys/prekeys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newPreKeys)
        .expect(404);
    });
  });

  describe('GET /keys/bundle/:userId', () => {
    it('should get prekey bundle successfully', async () => {
      // 用户2上传密钥
      await request(app.getHttpServer())
        .post('/keys/upload')
        .set('Authorization', `Bearer ${accessToken2}`)
        .send(mockKeys)
        .expect(200);

      // 用户1获取用户2的密钥包
      const response = await request(app.getHttpServer())
        .get(`/keys/bundle/${userId2}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('userId', userId2);
      expect(response.body).toHaveProperty(
        'registrationId',
        mockKeys.registrationId,
      );
      expect(response.body).toHaveProperty('identityKey', mockKeys.identityKey);
      expect(response.body).toHaveProperty(
        'signedPreKeyId',
        mockKeys.signedPreKeyId,
      );
      expect(response.body).toHaveProperty(
        'signedPreKey',
        mockKeys.signedPreKey,
      );
      expect(response.body).toHaveProperty(
        'signedPreKeySignature',
        mockKeys.signedPreKeySignature,
      );
      expect(response.body).toHaveProperty(
        'kyberPreKeyId',
        mockKeys.kyberPreKeyId,
      );
      expect(response.body).toHaveProperty('kyberPreKey', mockKeys.kyberPreKey);
      expect(response.body).toHaveProperty(
        'kyberPreKeySignature',
        mockKeys.kyberPreKeySignature,
      );
      // 应该包含一个一次性预密钥
      expect(response.body).toHaveProperty('preKeyId');
      expect(response.body).toHaveProperty('preKey');
    });

    it('should consume prekey on each request', async () => {
      // 用户2上传密钥
      await request(app.getHttpServer())
        .post('/keys/upload')
        .set('Authorization', `Bearer ${accessToken2}`)
        .send(mockKeys)
        .expect(200);

      // 获取第一个密钥包
      const response1 = await request(app.getHttpServer())
        .get(`/keys/bundle/${userId2}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response1.body.preKeyId).toBe(1);

      // 获取第二个密钥包
      const response2 = await request(app.getHttpServer())
        .get(`/keys/bundle/${userId2}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response2.body.preKeyId).toBe(2);

      // 获取第三个密钥包
      const response3 = await request(app.getHttpServer())
        .get(`/keys/bundle/${userId2}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response3.body.preKeyId).toBe(3);

      // 第四次应该没有一次性预密钥了
      const response4 = await request(app.getHttpServer())
        .get(`/keys/bundle/${userId2}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response4.body).not.toHaveProperty('preKeyId');
      expect(response4.body).not.toHaveProperty('preKey');
    });

    it('should fail for user without keys', async () => {
      await request(app.getHttpServer())
        .get(`/keys/bundle/${userId2}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail for non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/keys/bundle/non-existent-user-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});

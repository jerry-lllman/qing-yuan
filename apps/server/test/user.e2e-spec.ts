import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  const testUser = {
    username: 'usertest',
    email: 'usertest@example.com',
    password: 'Test123456',
    confirmPassword: 'Test123456',
    nickname: '用户测试',
  };

  const secondUser = {
    username: 'searchuser',
    email: 'searchuser@example.com',
    password: 'Test123456',
    confirmPassword: 'Test123456',
    nickname: '搜索用户',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // 清理测试数据
    await cleanupTestData();

    // 注册测试用户
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    userId = registerRes.body.user.id;

    // 清理该用户的 refreshToken，避免冲突
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    // 等待一小段时间确保 token 唯一
    await new Promise((resolve) => setTimeout(resolve, 100));

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: testUser.username,
        password: testUser.password,
      })
      .expect(200);

    accessToken = loginRes.body.accessToken;

    // 注册第二个用户用于搜索测试
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(secondUser)
      .expect(201);
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function cleanupTestData() {
    // 删除测试用户相关数据
    const users = await prisma.user.findMany({
      where: {
        username: { in: [testUser.username, secondUser.username] },
      },
    });

    const userIds = users.map((u) => u.id);

    if (userIds.length > 0) {
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.userSettings.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
  }

  describe('GET /users/me', () => {
    it('should get current user info', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', userId);
      expect(res.body).toHaveProperty('username', testUser.username);
      expect(res.body).toHaveProperty('email', testUser.email);
      expect(res.body).toHaveProperty('nickname', testUser.nickname);
      expect(res.body).not.toHaveProperty('password');
    });

    it('should fail without auth token', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });
  });

  describe('PUT /users/me', () => {
    it('should update current user profile', async () => {
      const updateData = {
        nickname: '新昵称',
        bio: '这是个人简介',
      };

      const res = await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body).toHaveProperty('nickname', updateData.nickname);
      expect(res.body).toHaveProperty('bio', updateData.bio);
    });

    it('should fail with too long bio', async () => {
      const updateData = {
        bio: 'a'.repeat(201), // 超过 200 字符限制
      };

      await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(400);
    });

    it('should fail without auth token', async () => {
      await request(app.getHttpServer())
        .put('/users/me')
        .send({ nickname: 'test' })
        .expect(401);
    });
  });

  describe('GET /users/me/settings', () => {
    it('should get user settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 应该返回设置对象
      expect(res.body).toHaveProperty('language');
      expect(res.body).toHaveProperty('theme');
    });

    it('should fail without auth token', async () => {
      await request(app.getHttpServer()).get('/users/me/settings').expect(401);
    });
  });

  describe('PUT /users/me/settings', () => {
    it('should update user settings', async () => {
      const updateData = {
        theme: 'dark',
        language: 'en',
        notificationEnabled: false,
      };

      const res = await request(app.getHttpServer())
        .put('/users/me/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body).toHaveProperty('theme', updateData.theme);
      expect(res.body).toHaveProperty('language', updateData.language);
      expect(res.body).toHaveProperty(
        'notificationEnabled',
        updateData.notificationEnabled,
      );
    });

    it('should fail with invalid theme value', async () => {
      const updateData = {
        theme: 'invalid-theme',
      };

      await request(app.getHttpServer())
        .put('/users/me/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(400);
    });

    it('should fail without auth token', async () => {
      await request(app.getHttpServer())
        .put('/users/me/settings')
        .send({ theme: 'dark' })
        .expect(401);
    });
  });

  describe('GET /users/search', () => {
    it('should search users by keyword', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/search')
        .query({ keyword: 'search' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // 应该找到 secondUser
      const found = res.body.find(
        (u: { username: string }) => u.username === secondUser.username,
      );
      expect(found).toBeDefined();
    });

    it('should not include current user in search results', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/search')
        .query({ keyword: 'usertest' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 不应该包含当前用户
      const found = res.body.find(
        (u: { username: string }) => u.username === testUser.username,
      );
      expect(found).toBeUndefined();
    });

    it('should return empty array for non-matching keyword', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/search')
        .query({ keyword: 'nonexistent12345' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('should fail without auth token', async () => {
      await request(app.getHttpServer())
        .get('/users/search')
        .query({ keyword: 'test' })
        .expect(401);
    });
  });

  describe('GET /users/:id', () => {
    it('should get user by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', userId);
      expect(res.body).toHaveProperty('username', testUser.username);
      expect(res.body).not.toHaveProperty('password');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/users/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('GET /users/username/:username', () => {
    it('should get user by username', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/username/${testUser.username}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('username', testUser.username);
      // findByUsername 不返回 email (隐私保护)
      expect(res.body).toHaveProperty('nickname');
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('email');
    });

    it('should return 404 for non-existent username', async () => {
      await request(app.getHttpServer())
        .get('/users/username/nonexistentuser12345')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { describe, it, beforeAll, afterAll, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // 测试用户数据
  const testUser = {
    username: 'testuser',
    email: 'testuser@example.com',
    password: 'Test123456',
    confirmPassword: 'Test123456',
    nickname: '测试用户',
  };

  // 存储 token
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

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
    // 每个测试前清理测试用户相关数据
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: testUser.username }, { email: testUser.email }],
      },
    });
    if (user) {
      // 先删除关联数据
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.userSettings.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  afterAll(async () => {
    // 清理测试数据
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: testUser.username }, { email: testUser.email }],
      },
    });
    if (user) {
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.userSettings.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should fail with duplicate username', async () => {
      // 先注册一个用户
      await request(app.getHttpServer()).post('/auth/register').send(testUser);

      // 再次注册相同用户名
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.message).toMatch(/用户名|已/);
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'newuser',
          email: 'invalid-email',
          password: 'Test123456',
          confirmPassword: 'Test123456',
          nickname: '新用户',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should fail with weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'newuser2',
          email: 'newuser2@example.com',
          password: '123',
          confirmPassword: '123',
          nickname: '新用户2',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should fail when password and confirmPassword do not match', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'newuser3',
          email: 'newuser3@example.com',
          password: 'Test123456',
          confirmPassword: 'DifferentPassword123',
          nickname: '新用户3',
        })
        .expect(400);

      expect(response.body.message).toContain('两次输入的密码不一致');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // 每个登录测试前先注册用户
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser);
      if (response.body.user) {
        userId = response.body.user.id;
      }
    });

    it('should login successfully with correct credentials', async () => {
      // 先清除之前的 refresh token
      await prisma.refreshToken.deleteMany({ where: { userId } });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: testUser.username,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');

      // 保存 token 用于后续测试
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should fail with wrong password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: testUser.username,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toMatch(/密码|错误/);
    });

    it('should fail with non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: 'nonexistentuser',
          password: 'Test123456',
        })
        .expect(401);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /auth/refresh', () => {
    beforeEach(async () => {
      // 注册并登录获取 token
      await request(app.getHttpServer()).post('/auth/register').send(testUser);

      // 清除注册时的 token
      const user = await prisma.user.findFirst({
        where: { username: testUser.username },
      });
      if (user) {
        userId = user.id;
        await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      }

      // 重新登录获取新 token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: testUser.username,
          password: testUser.password,
        });

      accessToken = loginResponse.body.accessToken;
      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should fail with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    beforeEach(async () => {
      // 注册并登录获取 token
      await request(app.getHttpServer()).post('/auth/register').send(testUser);

      const user = await prisma.user.findFirst({
        where: { username: testUser.username },
      });
      if (user) {
        userId = user.id;
        await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      }

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: testUser.username,
          password: testUser.password,
        });

      accessToken = loginResponse.body.accessToken;
      refreshToken = loginResponse.body.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should fail without auth token', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });
  });
});

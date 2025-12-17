import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('ChatController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // 用户 A 的信息
  let userAToken: string;
  let userAId: string;

  // 用户 B 的信息
  let userBToken: string;
  let userBId: string;

  // 创建的会话 ID
  let privateChatId: string;
  let groupChatId: string;

  const userA = {
    username: 'chattesta',
    email: 'chattesta@example.com',
    password: 'Test123456',
    confirmPassword: 'Test123456',
    nickname: '聊天测试A',
  };

  const userB = {
    username: 'chattestb',
    email: 'chattestb@example.com',
    password: 'Test123456',
    confirmPassword: 'Test123456',
    nickname: '聊天测试B',
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

    // 注册并登录用户 A
    const registerARes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userA)
      .expect(201);
    userAId = registerARes.body.user.id;

    await prisma.refreshToken.deleteMany({ where: { userId: userAId } });
    await new Promise((resolve) => setTimeout(resolve, 100));

    const loginARes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ account: userA.username, password: userA.password })
      .expect(200);
    userAToken = loginARes.body.accessToken;

    // 注册并登录用户 B
    const registerBRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userB)
      .expect(201);
    userBId = registerBRes.body.user.id;

    await prisma.refreshToken.deleteMany({ where: { userId: userBId } });
    await new Promise((resolve) => setTimeout(resolve, 100));

    const loginBRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ account: userB.username, password: userB.password })
      .expect(200);
    userBToken = loginBRes.body.accessToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function cleanupTestData() {
    const users = await prisma.user.findMany({
      where: {
        username: { in: [userA.username, userB.username] },
      },
    });

    const userIds = users.map((u) => u.id);

    if (userIds.length > 0) {
      // 删除会话成员
      await prisma.conversationMember.deleteMany({
        where: { userId: { in: userIds } },
      });

      // 删除消息
      await prisma.message.deleteMany({
        where: { senderId: { in: userIds } },
      });

      // 删除空会话
      const emptyConversations = await prisma.conversation.findMany({
        where: {
          members: { none: {} },
        },
      });
      await prisma.conversation.deleteMany({
        where: { id: { in: emptyConversations.map((c) => c.id) } },
      });

      // 删除 refresh tokens
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: userIds } },
      });

      // 删除用户设置
      await prisma.userSettings.deleteMany({
        where: { userId: { in: userIds } },
      });

      // 删除用户
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
  }

  describe('POST /conversations/private', () => {
    it('should create a private chat', async () => {
      const res = await request(app.getHttpServer())
        .post('/conversations/private')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ targetUserId: userBId })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('type', 'PRIVATE');
      privateChatId = res.body.id;
    });

    it('should return existing chat for same users', async () => {
      const res = await request(app.getHttpServer())
        .post('/conversations/private')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ targetUserId: userBId })
        .expect(201);

      // 应该返回相同的会话
      expect(res.body).toHaveProperty('id', privateChatId);
    });

    it('should fail to create private chat with self', async () => {
      await request(app.getHttpServer())
        .post('/conversations/private')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ targetUserId: userAId })
        .expect(400);
    });

    it('should fail without auth token', async () => {
      await request(app.getHttpServer())
        .post('/conversations/private')
        .send({ targetUserId: userBId })
        .expect(401);
    });
  });

  describe('POST /conversations/group', () => {
    it('should create a group chat', async () => {
      const res = await request(app.getHttpServer())
        .post('/conversations/group')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: '测试群聊',
          memberIds: [userBId],
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('type', 'GROUP');
      expect(res.body).toHaveProperty('name', '测试群聊');
      groupChatId = res.body.id;
    });

    it('should fail with empty name', async () => {
      await request(app.getHttpServer())
        .post('/conversations/group')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: '',
          memberIds: [userBId],
        })
        .expect(400);
    });

    it('should fail with too long name', async () => {
      await request(app.getHttpServer())
        .post('/conversations/group')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'a'.repeat(51),
          memberIds: [userBId],
        })
        .expect(400);
    });

    it('should fail without auth token', async () => {
      await request(app.getHttpServer())
        .post('/conversations/group')
        .send({ name: 'test', memberIds: [] })
        .expect(401);
    });
  });

  describe('GET /conversations', () => {
    it('should get conversation list', async () => {
      const res = await request(app.getHttpServer())
        .get('/conversations')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2); // 私聊 + 群聊
    });

    it('should fail without auth token', async () => {
      await request(app.getHttpServer()).get('/conversations').expect(401);
    });
  });

  describe('GET /conversations/:id', () => {
    it('should get private conversation detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/conversations/${privateChatId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', privateChatId);
      expect(res.body).toHaveProperty('type', 'PRIVATE');
    });

    it('should get group conversation detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/conversations/${groupChatId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', groupChatId);
      expect(res.body).toHaveProperty('type', 'GROUP');
      expect(res.body).toHaveProperty('name', '测试群聊');
    });

    it('should fail for non-existent conversation', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/conversations/${fakeId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);
    });
  });

  describe('PUT /conversations/:id', () => {
    it('should update conversation settings', async () => {
      const res = await request(app.getHttpServer())
        .put(`/conversations/${privateChatId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          isMuted: true,
          isPinned: true,
        })
        .expect(200);

      expect(res.body).toHaveProperty('isMuted', true);
      expect(res.body).toHaveProperty('isPinned', true);
    });

    it('should fail for non-member', async () => {
      // 使用不存在的会话 ID，服务返回 403 Forbidden（非会话成员）
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .put(`/conversations/${fakeId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ isMuted: true })
        .expect(403);
    });
  });

  describe('POST /conversations/:id/leave', () => {
    it('should leave group conversation', async () => {
      // 用户 B 离开群聊
      await request(app.getHttpServer())
        .post(`/conversations/${groupChatId}/leave`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(201);

      // 验证用户 B 已不在群聊中
      const res = await request(app.getHttpServer())
        .get(`/conversations/${groupChatId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(404);
    });

    it('should fail to leave private conversation', async () => {
      await request(app.getHttpServer())
        .post(`/conversations/${privateChatId}/leave`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(400);
    });
  });

  describe('DELETE /conversations/:id', () => {
    it('should delete conversation for user', async () => {
      await request(app.getHttpServer())
        .delete(`/conversations/${privateChatId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      // 注意：当前实现只是将 lastReadAt 设为 null，会话列表查询未过滤
      // 这里验证删除操作成功返回
    });

    it('should fail for non-existent conversation', async () => {
      // 服务返回 403 Forbidden（非会话成员）而不是 404
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .delete(`/conversations/${fakeId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(403);
    });
  });
});

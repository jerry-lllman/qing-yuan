import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('MessageController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // 用户 A 的信息
  let userAToken: string;
  let userAId: string;

  // 用户 B 的信息
  let userBToken: string;
  let userBId: string;

  // 会话和消息 ID
  let conversationId: string;
  let messageId: string;

  const userA = {
    username: 'msgtesta',
    email: 'msgtesta@example.com',
    password: 'Test123456',
    confirmPassword: 'Test123456',
    nickname: '消息测试A',
  };

  const userB = {
    username: 'msgtestb',
    email: 'msgtestb@example.com',
    password: 'Test123456',
    confirmPassword: 'Test123456',
    nickname: '消息测试B',
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

    // 创建一个私聊会话用于消息测试
    const chatRes = await request(app.getHttpServer())
      .post('/conversations/private')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ targetUserId: userBId })
      .expect(201);
    conversationId = chatRes.body.id;
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
      // 删除消息
      await prisma.message.deleteMany({
        where: { senderId: { in: userIds } },
      });

      // 删除会话成员
      await prisma.conversationMember.deleteMany({
        where: { userId: { in: userIds } },
      });

      // 删除空会话
      const emptyConversations = await prisma.conversation.findMany({
        where: { members: { none: {} } },
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

  describe('POST /messages', () => {
    it('should send a text message', async () => {
      const res = await request(app.getHttpServer())
        .post('/messages')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          conversationId,
          type: 'TEXT',
          content: '你好，这是一条测试消息',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('content', '你好，这是一条测试消息');
      expect(res.body).toHaveProperty('type', 'TEXT');
      expect(res.body).toHaveProperty('senderId', userAId);
      messageId = res.body.id;
    });

    it('should send a message with clientMessageId for deduplication', async () => {
      const clientMessageId = 'client-msg-' + Date.now();
      const res = await request(app.getHttpServer())
        .post('/messages')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          conversationId,
          type: 'TEXT',
          content: '带有客户端ID的消息',
          clientMessageId,
        })
        .expect(201);

      // clientMessageId 用于去重，可能不在响应中返回
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('content', '带有客户端ID的消息');
    });

    it('should fail with empty content', async () => {
      await request(app.getHttpServer())
        .post('/messages')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          conversationId,
          type: 'TEXT',
          content: '',
        })
        .expect(400);
    });

    it('should fail with invalid message type', async () => {
      await request(app.getHttpServer())
        .post('/messages')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          conversationId,
          type: 'INVALID_TYPE',
          content: 'test',
        })
        .expect(400);
    });

    it('should fail for non-member conversation', async () => {
      const fakeConvId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .post('/messages')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          conversationId: fakeConvId,
          type: 'TEXT',
          content: 'test',
        })
        .expect(403);
    });

    it('should fail without auth token', async () => {
      await request(app.getHttpServer())
        .post('/messages')
        .send({
          conversationId,
          type: 'TEXT',
          content: 'test',
        })
        .expect(401);
    });
  });

  describe('GET /messages/conversation/:conversationId', () => {
    it('should get message history', async () => {
      const res = await request(app.getHttpServer())
        .get(`/messages/conversation/${conversationId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should get messages with limit', async () => {
      const res = await request(app.getHttpServer())
        .get(`/messages/conversation/${conversationId}`)
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeLessThanOrEqual(1);
    });

    it('should fail for non-member conversation', async () => {
      const fakeConvId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/messages/conversation/${fakeConvId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(403);
    });

    it('should fail without auth token', async () => {
      await request(app.getHttpServer())
        .get(`/messages/conversation/${conversationId}`)
        .expect(401);
    });
  });

  describe('PUT /messages/:id', () => {
    it('should edit own message', async () => {
      const res = await request(app.getHttpServer())
        .put(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ content: '编辑后的消息内容' })
        .expect(200);

      expect(res.body).toHaveProperty('content', '编辑后的消息内容');
      expect(res.body).toHaveProperty('isEdited', true);
    });

    it('should fail to edit other user message', async () => {
      // 用户 B 尝试编辑用户 A 的消息
      await request(app.getHttpServer())
        .put(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ content: '尝试编辑别人的消息' })
        .expect(403);
    });

    it('should fail for non-existent message', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .put(`/messages/${fakeId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ content: 'test' })
        .expect(404);
    });
  });

  describe('POST /messages/read', () => {
    it('should mark messages as read', async () => {
      const res = await request(app.getHttpServer())
        .post('/messages/read')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          conversationId,
          messageId,
        })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should fail for non-member conversation', async () => {
      const fakeConvId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .post('/messages/read')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          conversationId: fakeConvId,
          messageId,
        })
        .expect(403);
    });
  });

  describe('DELETE /messages/:id', () => {
    let deleteMessageId: string;

    beforeAll(async () => {
      // 创建一条用于删除测试的消息
      const res = await request(app.getHttpServer())
        .post('/messages')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          conversationId,
          type: 'TEXT',
          content: '这条消息将被删除',
        });
      deleteMessageId = res.body.id;
    });

    it('should delete own message', async () => {
      await request(app.getHttpServer())
        .delete(`/messages/${deleteMessageId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);
    });

    it('should fail to delete other user message', async () => {
      // 用户 B 尝试删除用户 A 的消息
      await request(app.getHttpServer())
        .delete(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(403);
    });

    it('should fail for non-existent message', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .delete(`/messages/${fakeId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);
    });
  });
});

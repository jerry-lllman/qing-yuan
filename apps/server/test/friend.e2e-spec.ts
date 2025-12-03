import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('FriendController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // 用户 A 的信息
  let userAToken: string;
  let userAId: string;

  // 用户 B 的信息
  let userBToken: string;
  let userBId: string;

  const userA = {
    username: 'friendtesta',
    email: 'friendtesta@example.com',
    password: 'Test123456',
    nickname: '好友测试A',
  };

  const userB = {
    username: 'friendtestb',
    email: 'friendtestb@example.com',
    password: 'Test123456',
    nickname: '好友测试B',
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
      // 删除好友请求
      await prisma.friendRequest.deleteMany({
        where: {
          OR: [{ senderId: { in: userIds } }, { receiverId: { in: userIds } }],
        },
      });

      // 删除好友关系
      await prisma.friendship.deleteMany({
        where: {
          OR: [{ userId: { in: userIds } }, { friendId: { in: userIds } }],
        },
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

  describe('POST /friends/requests', () => {
    it('should send a friend request', async () => {
      const res = await request(app.getHttpServer())
        .post('/friends/requests')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          receiverId: userBId,
          message: '你好，我想加你为好友',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('senderId', userAId);
      expect(res.body).toHaveProperty('receiverId', userBId);
      expect(res.body).toHaveProperty('status', 'PENDING');
    });

    it('should fail to send duplicate request', async () => {
      await request(app.getHttpServer())
        .post('/friends/requests')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          receiverId: userBId,
        })
        .expect(409); // ConflictException
    });

    it('should fail to send request to self', async () => {
      await request(app.getHttpServer())
        .post('/friends/requests')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          receiverId: userAId,
        })
        .expect(400);
    });

    it('should fail without auth token', async () => {
      await request(app.getHttpServer())
        .post('/friends/requests')
        .send({ receiverId: userBId })
        .expect(401);
    });
  });

  describe('GET /friends/requests/received', () => {
    it('should get received friend requests', async () => {
      const res = await request(app.getHttpServer())
        .get('/friends/requests/received')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // 应该包含来自 userA 的请求
      const fromUserA = res.body.find(
        (r: { senderId: string }) => r.senderId === userAId,
      );
      expect(fromUserA).toBeDefined();
    });

    it('should fail without auth token', async () => {
      await request(app.getHttpServer())
        .get('/friends/requests/received')
        .expect(401);
    });
  });

  describe('GET /friends/requests/sent', () => {
    it('should get sent friend requests', async () => {
      const res = await request(app.getHttpServer())
        .get('/friends/requests/sent')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // 应该包含发给 userB 的请求
      const toUserB = res.body.find(
        (r: { receiverId: string }) => r.receiverId === userBId,
      );
      expect(toUserB).toBeDefined();
    });
  });

  describe('POST /friends/requests/:id/accept', () => {
    let requestId: string;

    beforeAll(async () => {
      // 获取好友请求 ID
      const res = await request(app.getHttpServer())
        .get('/friends/requests/received')
        .set('Authorization', `Bearer ${userBToken}`);

      const fromUserA = res.body.find(
        (r: { senderId: string }) => r.senderId === userAId,
      );
      requestId = fromUserA?.id;
    });

    it('should accept friend request', async () => {
      expect(requestId).toBeDefined();

      const res = await request(app.getHttpServer())
        .post(`/friends/requests/${requestId}/accept`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(201);

      // acceptFriendRequest 返回的是 friendship 对象
      expect(res.body).toHaveProperty('friendId', userAId);
    });

    it('should fail to accept non-existent request', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .post(`/friends/requests/${fakeId}/accept`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(404);
    });
  });

  describe('GET /friends', () => {
    it('should get friend list for user A', async () => {
      const res = await request(app.getHttpServer())
        .get('/friends')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // 应该包含 userB
      const friendB = res.body.find(
        (f: { friendId: string }) => f.friendId === userBId,
      );
      expect(friendB).toBeDefined();
    });

    it('should get friend list for user B', async () => {
      const res = await request(app.getHttpServer())
        .get('/friends')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // 应该包含 userA
      const friendA = res.body.find(
        (f: { friendId: string }) => f.friendId === userAId,
      );
      expect(friendA).toBeDefined();
    });

    it('should fail without auth token', async () => {
      await request(app.getHttpServer()).get('/friends').expect(401);
    });
  });

  describe('PUT /friends/:friendId', () => {
    it('should update friend remark', async () => {
      const res = await request(app.getHttpServer())
        .put(`/friends/${userBId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ remark: '我的好朋友B' })
        .expect(200);

      expect(res.body).toHaveProperty('remark', '我的好朋友B');
    });

    it('should fail with too long remark', async () => {
      await request(app.getHttpServer())
        .put(`/friends/${userBId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ remark: 'a'.repeat(31) })
        .expect(400);
    });

    it('should fail for non-existent friend', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .put(`/friends/${fakeId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ remark: 'test' })
        .expect(404);
    });
  });

  describe('POST /friends/requests/:id/reject', () => {
    let newRequestId: string;

    beforeAll(async () => {
      // 先删除好友关系，以便重新发送请求测试拒绝
      await request(app.getHttpServer())
        .delete(`/friends/${userBId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      await request(app.getHttpServer())
        .delete(`/friends/${userAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      // 清理旧的好友请求
      await prisma.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: userAId, receiverId: userBId },
            { senderId: userBId, receiverId: userAId },
          ],
        },
      });

      // B 向 A 发送好友请求
      const reqRes = await request(app.getHttpServer())
        .post('/friends/requests')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ receiverId: userAId });

      newRequestId = reqRes.body.id;
    });

    it('should reject friend request', async () => {
      expect(newRequestId).toBeDefined();

      const res = await request(app.getHttpServer())
        .post(`/friends/requests/${newRequestId}/reject`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(201);

      // rejectFriendRequest 返回 { success: true }
      expect(res.body).toHaveProperty('success', true);
    });
  });

  describe('DELETE /friends/:friendId', () => {
    beforeAll(async () => {
      // 重新建立好友关系用于删除测试
      await prisma.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: userAId, receiverId: userBId },
            { senderId: userBId, receiverId: userAId },
          ],
        },
      });

      // A 向 B 发送请求
      const reqRes = await request(app.getHttpServer())
        .post('/friends/requests')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ receiverId: userBId });

      const requestId = reqRes.body.id;

      // B 接受请求
      await request(app.getHttpServer())
        .post(`/friends/requests/${requestId}/accept`)
        .set('Authorization', `Bearer ${userBToken}`);
    });

    it('should delete friend', async () => {
      await request(app.getHttpServer())
        .delete(`/friends/${userBId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      // 验证好友已删除
      const res = await request(app.getHttpServer())
        .get('/friends')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      const friendB = res.body.find(
        (f: { friendId: string }) => f.friendId === userBId,
      );
      expect(friendB).toBeUndefined();
    });

    it('should fail for non-existent friend', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .delete(`/friends/${fakeId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);
    });
  });
});

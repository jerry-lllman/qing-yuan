import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('GroupController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // 用户 A（群主）
  let userAToken: string;
  let userAId: string;

  // 用户 B（将成为管理员）
  let userBToken: string;
  let userBId: string;

  // 用户 C（普通成员）
  let userCToken: string;
  let userCId: string;

  // 群组 ID
  let groupId: string;

  const userA = {
    username: 'grouptesta',
    email: 'grouptesta@example.com',
    password: 'Test123456',
    nickname: '群主A',
  };

  const userB = {
    username: 'grouptestb',
    email: 'grouptestb@example.com',
    password: 'Test123456',
    nickname: '管理员B',
  };

  const userC = {
    username: 'grouptestc',
    email: 'grouptestc@example.com',
    password: 'Test123456',
    nickname: '成员C',
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

    // 注册并登录用户 A（群主）
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

    // 注册并登录用户 C（初始不在群组中）
    const registerCRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userC)
      .expect(201);
    userCId = registerCRes.body.user.id;

    await prisma.refreshToken.deleteMany({ where: { userId: userCId } });
    await new Promise((resolve) => setTimeout(resolve, 100));

    const loginCRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ account: userC.username, password: userC.password })
      .expect(200);
    userCToken = loginCRes.body.accessToken;

    // 创建群组（通过 Chat 模块），仅包含 A 和 B
    const groupRes = await request(app.getHttpServer())
      .post('/conversations/group')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: '测试群组',
        memberIds: [userBId],
      })
      .expect(201);
    groupId = groupRes.body.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function cleanupTestData() {
    const users = await prisma.user.findMany({
      where: {
        username: { in: [userA.username, userB.username, userC.username] },
      },
    });

    const userIds = users.map((u) => u.id);

    if (userIds.length > 0) {
      await prisma.message.deleteMany({
        where: { senderId: { in: userIds } },
      });

      await prisma.conversationMember.deleteMany({
        where: { userId: { in: userIds } },
      });

      const emptyConversations = await prisma.conversation.findMany({
        where: { members: { none: {} } },
      });
      await prisma.conversation.deleteMany({
        where: { id: { in: emptyConversations.map((c) => c.id) } },
      });

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

  // ============================================================
  // 基础查询测试（不修改状态）
  // ============================================================
  describe('GET /groups/:groupId - 获取群组详情', () => {
    it('should get group details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', groupId);
      expect(res.body).toHaveProperty('name', '测试群组');
      expect(res.body).toHaveProperty('type', 'GROUP');
    });

    it('should fail for non-member (returns 404 - hides group existence)', async () => {
      // 用户 C 不是群成员，API 返回 404（群组不存在或您不是群成员）
      await request(app.getHttpServer())
        .get(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${userCToken}`)
        .expect(404);
    });

    it('should fail for non-existent group', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/groups/${fakeId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);
    });
  });

  describe('GET /groups/:groupId/members - 获取成员列表', () => {
    it('should get member list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2); // A 和 B
    });

    it('should fail for non-member', async () => {
      await request(app.getHttpServer())
        .get(`/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${userCToken}`)
        .expect(403);
    });
  });

  // ============================================================
  // 群信息修改测试
  // ============================================================
  describe('PUT /groups/:groupId - 修改群信息', () => {
    it('should update group info by owner', async () => {
      const res = await request(app.getHttpServer())
        .put(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: '更新后的群名' })
        .expect(200);

      expect(res.body).toHaveProperty('name', '更新后的群名');
    });

    it('should fail for non-admin member', async () => {
      // 用户 B 是普通成员，不能修改群信息
      await request(app.getHttpServer())
        .put(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: '尝试修改' })
        .expect(403);
    });

    it('should fail with too long name', async () => {
      await request(app.getHttpServer())
        .put(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'a'.repeat(51) })
        .expect(400);
    });
  });

  // ============================================================
  // 成员管理测试（按顺序执行，有状态依赖）
  // ============================================================
  describe('成员管理流程', () => {
    // Step 1: 添加成员 C
    it('should add member C to group', async () => {
      const res = await request(app.getHttpServer())
        .post(`/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ userIds: [userCId] })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('addedCount', 1);
    });

    // Step 2: 不能重复添加
    it('should fail to add duplicate member', async () => {
      await request(app.getHttpServer())
        .post(`/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ userIds: [userCId] })
        .expect(400);
    });

    // Step 3: 空数组验证
    it('should fail with empty userIds', async () => {
      await request(app.getHttpServer())
        .post(`/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ userIds: [] })
        .expect(400);
    });

    // Step 4: 设置 B 为管理员
    it('should set user B as admin by owner', async () => {
      const res = await request(app.getHttpServer())
        .put(`/groups/${groupId}/members/${userBId}/admin`)
        .query({ isAdmin: 'true' })
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('role', 'ADMIN');
    });

    // Step 5: 管理员不能设置管理员
    it('should fail for admin to set another admin', async () => {
      await request(app.getHttpServer())
        .put(`/groups/${groupId}/members/${userCId}/admin`)
        .query({ isAdmin: 'true' })
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(403);
    });

    // Step 6: 群主更新成员 C 的昵称
    it('should update member nickname by owner', async () => {
      const res = await request(app.getHttpServer())
        .put(`/groups/${groupId}/members/${userCId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ nickname: '成员小C' })
        .expect(200);

      expect(res.body).toHaveProperty('nickname', '成员小C');
    });

    // Step 7: 普通成员不能移除他人
    it('should fail for member to remove others', async () => {
      await request(app.getHttpServer())
        .delete(`/groups/${groupId}/members/${userBId}`)
        .set('Authorization', `Bearer ${userCToken}`)
        .expect(403);
    });

    // Step 8: 管理员不能移除群主
    it('should fail for admin to remove owner', async () => {
      await request(app.getHttpServer())
        .delete(`/groups/${groupId}/members/${userAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(403);
    });

    // Step 9: 管理员可以移除普通成员
    it('should allow admin to remove member C', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/groups/${groupId}/members/${userCId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });
  });

  // ============================================================
  // 群主转让和解散（最后执行，会改变群主或销毁群）
  // ============================================================
  describe('群主转让', () => {
    it('should transfer owner from A to B', async () => {
      const res = await request(app.getHttpServer())
        .post(`/groups/${groupId}/transfer`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ newOwnerId: userBId })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should fail for former owner to transfer again', async () => {
      // 用户 A 不再是群主
      await request(app.getHttpServer())
        .post(`/groups/${groupId}/transfer`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ newOwnerId: userAId })
        .expect(403);
    });
  });

  describe('解散群组', () => {
    it('should fail for non-owner to dissolve', async () => {
      // 用户 A 不再是群主（B 是群主）
      await request(app.getHttpServer())
        .delete(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(403);
    });

    it('should dissolve group by new owner B', async () => {
      // 用户 B 现在是群主
      const res = await request(app.getHttpServer())
        .delete(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should return 404 for dissolved group', async () => {
      // 验证群组已解散
      await request(app.getHttpServer())
        .get(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(404);
    });
  });
});

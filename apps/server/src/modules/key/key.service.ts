import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { Prisma } from '@prisma/client';
import { UploadKeysDto, PreKeyDto, ReplenishPreKeysDto } from './dto';

@Injectable()
export class KeyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 上传用户密钥包
   */
  async uploadKeys(userId: string, dto: UploadKeysDto): Promise<void> {
    const {
      registrationId,
      identityKey,
      signedPreKeyId,
      signedPreKey,
      signedPreKeySignature,
      kyberPreKeyId,
      kyberPreKey,
      kyberPreKeySignature,
      preKeys,
    } = dto;

    // 将 Base64 字符串转换为 Buffer
    const identityKeyBuffer = Buffer.from(identityKey, 'base64');
    const signedPreKeyBuffer = Buffer.from(signedPreKey, 'base64');
    const signedPreKeySignatureBuffer = Buffer.from(
      signedPreKeySignature,
      'base64',
    );
    const kyberPreKeyBuffer = Buffer.from(kyberPreKey, 'base64');
    const kyberPreKeySignatureBuffer = Buffer.from(
      kyberPreKeySignature,
      'base64',
    );

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 创建或更新用户身份密钥
      const userIdentityKey = await tx.userIdentityKey.upsert({
        where: { userId },
        create: {
          userId,
          registrationId,
          identityKey: identityKeyBuffer,
          signedPreKeyId,
          signedPreKey: signedPreKeyBuffer,
          signedPreKeySignature: signedPreKeySignatureBuffer,
          signedPreKeyTimestamp: new Date(),
          kyberPreKeyId,
          kyberPreKey: kyberPreKeyBuffer,
          kyberPreKeySignature: kyberPreKeySignatureBuffer,
        },
        update: {
          registrationId,
          identityKey: identityKeyBuffer,
          signedPreKeyId,
          signedPreKey: signedPreKeyBuffer,
          signedPreKeySignature: signedPreKeySignatureBuffer,
          signedPreKeyTimestamp: new Date(),
          kyberPreKeyId,
          kyberPreKey: kyberPreKeyBuffer,
          kyberPreKeySignature: kyberPreKeySignatureBuffer,
        },
      });

      // 如果提供了预密钥，则存储它们
      if (preKeys && preKeys.length > 0) {
        // 删除旧的未使用预密钥
        await tx.preKey.deleteMany({
          where: {
            userIdentityId: userIdentityKey.id,
            used: false,
          },
        });

        // 插入新的预密钥
        await tx.preKey.createMany({
          data: preKeys.map((pk: PreKeyDto) => ({
            userIdentityId: userIdentityKey.id,
            keyId: pk.keyId,
            publicKey: Buffer.from(pk.publicKey, 'base64'),
          })),
        });
      }
    });
  }

  /**
   * 补充一次性预密钥
   */
  async replenishPreKeys(
    userId: string,
    dto: ReplenishPreKeysDto,
  ): Promise<void> {
    const userIdentityKey = await this.prisma.userIdentityKey.findUnique({
      where: { userId },
    });

    if (!userIdentityKey) {
      throw new NotFoundException('用户尚未上传密钥包');
    }

    // 批量创建预密钥（忽略重复的 keyId）
    const createData = dto.preKeys.map((pk) => ({
      userIdentityId: userIdentityKey.id,
      keyId: pk.keyId,
      publicKey: Buffer.from(pk.publicKey, 'base64'),
    }));

    await this.prisma.preKey.createMany({
      data: createData,
      skipDuplicates: true,
    });
  }

  /**
   * 获取用户的 PreKey Bundle
   * 用于建立加密会话
   */
  async getPreKeyBundle(targetUserId: string): Promise<{
    userId: string;
    registrationId: number;
    identityKey: string;
    signedPreKeyId: number;
    signedPreKey: string;
    signedPreKeySignature: string;
    kyberPreKeyId: number;
    kyberPreKey: string;
    kyberPreKeySignature: string;
    preKeyId?: number;
    preKey?: string;
  }> {
    const userIdentityKey = await this.prisma.userIdentityKey.findUnique({
      where: { userId: targetUserId },
      include: {
        preKeys: {
          where: { used: false },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!userIdentityKey) {
      throw new NotFoundException('目标用户尚未上传密钥');
    }

    // 构建响应
    const bundle: {
      userId: string;
      registrationId: number;
      identityKey: string;
      signedPreKeyId: number;
      signedPreKey: string;
      signedPreKeySignature: string;
      kyberPreKeyId: number;
      kyberPreKey: string;
      kyberPreKeySignature: string;
      preKeyId?: number;
      preKey?: string;
    } = {
      userId: targetUserId,
      registrationId: userIdentityKey.registrationId,
      identityKey: Buffer.from(userIdentityKey.identityKey).toString('base64'),
      signedPreKeyId: userIdentityKey.signedPreKeyId,
      signedPreKey: Buffer.from(userIdentityKey.signedPreKey).toString(
        'base64',
      ),
      signedPreKeySignature: Buffer.from(
        userIdentityKey.signedPreKeySignature,
      ).toString('base64'),
      kyberPreKeyId: userIdentityKey.kyberPreKeyId,
      kyberPreKey: Buffer.from(userIdentityKey.kyberPreKey).toString('base64'),
      kyberPreKeySignature: Buffer.from(
        userIdentityKey.kyberPreKeySignature,
      ).toString('base64'),
    };

    // 如果有可用的一次性预密钥，标记为已使用并返回
    if (userIdentityKey.preKeys.length > 0) {
      const preKey = userIdentityKey.preKeys[0];

      // 标记为已使用
      await this.prisma.preKey.update({
        where: { id: preKey.id },
        data: { used: true },
      });

      bundle.preKeyId = preKey.keyId;
      bundle.preKey = Buffer.from(preKey.publicKey).toString('base64');
    }

    return bundle;
  }

  /**
   * 获取用户密钥状态
   */
  async getKeyStatus(userId: string): Promise<{
    hasKeys: boolean;
    preKeyCount: number;
    signedPreKeyUpdatedAt?: Date;
  }> {
    const userIdentityKey = await this.prisma.userIdentityKey.findUnique({
      where: { userId },
      include: {
        _count: {
          select: {
            preKeys: {
              where: { used: false },
            },
          },
        },
      },
    });

    if (!userIdentityKey) {
      return {
        hasKeys: false,
        preKeyCount: 0,
      };
    }

    return {
      hasKeys: true,
      preKeyCount: userIdentityKey._count.preKeys,
      signedPreKeyUpdatedAt: userIdentityKey.signedPreKeyTimestamp,
    };
  }

  /**
   * 检查用户是否已上传密钥
   */
  async hasKeys(userId: string): Promise<boolean> {
    const count = await this.prisma.userIdentityKey.count({
      where: { userId },
    });
    return count > 0;
  }

  /**
   * 删除用户所有密钥（用于账户注销或重置）
   */
  async deleteAllKeys(userId: string): Promise<void> {
    await this.prisma.userIdentityKey
      .delete({
        where: { userId },
      })
      .catch(() => {
        // 如果不存在则忽略
      });
  }
}

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { KeyService } from './key.service';
import {
  UploadKeysDto,
  ReplenishPreKeysDto,
  PreKeyBundleResponseDto,
  KeyStatusResponseDto,
} from './dto';
import { CurrentUser } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards';

@UseGuards(JwtAuthGuard)
@Controller('keys')
export class KeyController {
  constructor(private readonly keyService: KeyService) {}

  /**
   * 上传用户密钥包
   * 客户端首次初始化或重置密钥时调用
   */
  @Post('upload')
  @HttpCode(HttpStatus.OK)
  async uploadKeys(
    @CurrentUser('id') userId: string,
    @Body() dto: UploadKeysDto,
  ): Promise<{ message: string }> {
    await this.keyService.uploadKeys(userId, dto);
    return { message: '密钥上传成功' };
  }

  /**
   * 补充一次性预密钥
   * 当预密钥数量不足时调用
   */
  @Post('prekeys')
  @HttpCode(HttpStatus.OK)
  async replenishPreKeys(
    @CurrentUser('id') userId: string,
    @Body() dto: ReplenishPreKeysDto,
  ): Promise<{ message: string }> {
    await this.keyService.replenishPreKeys(userId, dto);
    return { message: '预密钥补充成功' };
  }

  /**
   * 获取目标用户的 PreKey Bundle
   * 用于建立端到端加密会话
   */
  @Get('bundle/:userId')
  async getPreKeyBundle(
    @Param('userId') targetUserId: string,
  ): Promise<PreKeyBundleResponseDto> {
    return this.keyService.getPreKeyBundle(targetUserId);
  }

  /**
   * 获取当前用户的密钥状态
   */
  @Get('status')
  async getKeyStatus(
    @CurrentUser('id') userId: string,
  ): Promise<KeyStatusResponseDto> {
    return this.keyService.getKeyStatus(userId);
  }
}

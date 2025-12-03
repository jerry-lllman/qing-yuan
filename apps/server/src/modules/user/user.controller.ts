import { Controller, Get, Put, Body, Param, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto, UpdateSettingsDto } from './dto';
import { CurrentUser } from '../auth';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 获取当前用户信息
   */
  @Get('me')
  async getMe(@CurrentUser('id') userId: string) {
    return this.userService.findById(userId);
  }

  /**
   * 更新当前用户资料
   */
  @Put('me')
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(userId, dto);
  }

  /**
   * 获取用户设置
   */
  @Get('me/settings')
  async getSettings(@CurrentUser('id') userId: string) {
    return this.userService.getSettings(userId);
  }

  /**
   * 更新用户设置
   */
  @Put('me/settings')
  async updateSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.userService.updateSettings(userId, dto);
  }

  /**
   * 搜索用户
   */
  @Get('search')
  async search(
    @Query('keyword') keyword: string,
    @Query('limit') limit: number,
    @CurrentUser('id') userId: string,
  ) {
    return this.userService.search(keyword, userId, limit);
  }

  /**
   * 根据 ID 获取用户信息
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  /**
   * 根据用户名获取用户信息
   */
  @Get('username/:username')
  async findByUsername(@Param('username') username: string) {
    return this.userService.findByUsername(username);
  }
}

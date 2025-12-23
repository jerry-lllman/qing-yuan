/**
 * 用户相关类型定义
 */

/** 用户在线状态 */
export type UserStatus = 'online' | 'offline' | 'away' | 'busy' | 'invisible';

/** 用户基础信息 */
export interface User {
  id: string;
  username: string;
  nickname: string;
  avatar: string | null;
  email: string;
  phone: string | null;
  status: UserStatus;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** 用户简要信息（用于列表展示） */
export interface UserBrief {
  id: string;
  username: string;
  nickname: string;
  avatar: string | null;
  status: UserStatus;
  email: string;
}

/** 用户资料更新 */
export interface UserProfileUpdate {
  nickname?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
}

/** 用户设置 */
export interface UserSettings {
  userId: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  notificationEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

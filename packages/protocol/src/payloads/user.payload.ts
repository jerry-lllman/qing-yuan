/**
 * 用户事件载荷类型
 */

import { type UserStatus } from '@qyra/shared';

/** 更新用户状态载荷 */
export interface UpdateUserStatusPayload {
  status: UserStatus;
}

/** 用户状态变更通知载荷 */
export interface UserStatusChangedPayload {
  userId: string;
  status: UserStatus;
  lastSeenAt?: string;
}

/** 用户上线通知载荷 */
export interface UserOnlinePayload {
  userId: string;
  onlineAt: string;
}

/** 用户下线通知载荷 */
export interface UserOfflinePayload {
  userId: string;
  offlineAt: string;
  lastSeenAt: string;
}

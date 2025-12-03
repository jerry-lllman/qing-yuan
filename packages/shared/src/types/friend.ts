/**
 * 好友关系类型定义
 */

import { type UserBrief } from './user.js';

/** 好友请求状态 */
export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

/** 好友关系 */
export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  friend: UserBrief;
  remark: string | null; // 好友备注
  createdAt: Date;
}

/** 好友请求 */
export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUser: UserBrief;
  toUserId: string;
  toUser: UserBrief;
  message: string | null;
  status: FriendRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** 发送好友请求 */
export interface SendFriendRequest {
  toUserId: string;
  message?: string;
}

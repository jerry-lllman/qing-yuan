/**
 * 好友事件载荷类型
 */

/** 发送好友请求载荷 */
export interface SendFriendRequestPayload {
  toUserId: string;
  message?: string;
}

/** 响应好友请求载荷 */
export interface RespondFriendRequestPayload {
  requestId: string;
}

/** 移除好友载荷 */
export interface RemoveFriendPayload {
  friendId: string;
}

/** 收到好友请求通知载荷 */
export interface FriendRequestReceivedPayload {
  requestId: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string | null;
  message: string | null;
  createdAt: string;
}

/** 好友请求已接受通知载荷 */
export interface FriendRequestAcceptedPayload {
  requestId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  acceptedAt: string;
}

/** 新好友添加通知载荷 */
export interface FriendAddedPayload {
  friendId: string;
  friendName: string;
  friendAvatar: string | null;
  addedAt: string;
}

/** 好友移除通知载荷 */
export interface FriendRemovedPayload {
  friendId: string;
  removedAt: string;
}

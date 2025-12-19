import { Friend, FriendRequest } from '@qyra/shared';
import { API_VERSION, http } from './http-client';

/** Auth API 接口 */
export interface ContactApi {
  /** 获取好友列表 */
  getFriends: () => Promise<Friend[]>;
  /** 发送好友请求 */
  sendFriendRequest: (userId: string, message?: string) => Promise<FriendRequest>;
  /** 接受好友请求 */
  acceptFriendRequest: (requestId: string) => Promise<Friend>;
  /** 拒绝好友请求 */
  rejectFriendRequest: (requestId: string) => Promise<void>;
  /** 删除好友 */
  deleteFriend: (friendId: string) => Promise<void>;
  /** 更新好友备注 */
  updateFriendRemark: (friendId: string, remark: string | null) => Promise<void>;
  /** 获取收到的好友请求 */
  getReceivedRequests: () => Promise<FriendRequest[]>;
  /** 获取发出的好友请求 */
  getSentRequests: () => Promise<FriendRequest[]>;
  /** 拉黑用户 */
  // blockUser: (userId: string) => Promise<BlockedUser>;
  /** 取消拉黑 */
  unblockUser: (userId: string) => Promise<void>;
  /** 获取黑名单 */
  // getBlockedUsers: () => Promise<BlockedUser[]>;
}

/**
 * 创建 Auth API 实例
 * 纯 HTTP 封装，验证由 Form 层和服务端负责
 *
 * @param getHttpClient - 获取 HttpClient 实例的函数
 * @returns Auth API 实例
 */
export function createContactApi(version = API_VERSION.V1): ContactApi {
  return {
    async getFriends() {
      return http.get<Friend[]>(`${version}/friends`);
    },
    async sendFriendRequest(userId: string, message?: string) {
      return http.post<FriendRequest>(`${version}/friends/requests`, {
        receiverId: userId,
        message,
      });
    },
    async acceptFriendRequest(requestId: string) {
      return http.post<Friend>(`${version}/friends/requests/${requestId}/accept`);
    },
    async rejectFriendRequest(requestId: string) {
      return http.post<void>(`${version}/friends/requests/${requestId}/reject`);
    },
    async deleteFriend(friendId: string) {
      return http.delete<void>(`${version}/friends/${friendId}`);
    },
    async updateFriendRemark(friendId: string, remark: string | null) {
      return http.put<void>(`${version}/friends/${friendId}/remark`, { remark });
    },
    async getReceivedRequests() {
      return http.get<FriendRequest[]>(`${version}/friends/requests/received`);
    },
    async getSentRequests() {
      return http.get<FriendRequest[]>(`${version}/friends/requests/sent`);
    },
    // async blockUser(userId: string) {
    //   return http.post<BlockedUser>(`${version}/blocks`, { userId });
    // },
    async unblockUser(userId: string) {
      return http.delete<void>(`${version}/blocks/${userId}`);
    },
    // async getBlockedUsers() {
    //   return http.get<BlockedUser[]>(`${version}/blocks`);
  };
}

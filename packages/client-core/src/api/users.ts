import type { UserBrief } from '@qyra/shared';
import { getHttpClient, API_VERSION } from './http-client';

// TODO: 启用更多 API 时取消注释
// import type { User, UserSettings } from '@qyra/shared';

/**  */
export interface UsersApi {
  searchUsers: (params: { keyword: string; limit?: number }) => Promise<UserBrief[]>;
  // getUserById: (id: string) => Promise<User>;
  // updateUserProfile: (data: Partial<User>) => Promise<User>;
  // getUserSettings: () => Promise<UserSettings>;
  // updateUserSettings: (data: Partial<UserSettings>) => Promise<UserSettings>;
}

export function createUsersApi(version = API_VERSION.V1): UsersApi {
  return {
    async searchUsers(params: { keyword: string; limit?: number }) {
      const http = getHttpClient();
      return http.get<UserBrief[]>(`${version}/users/search`, { params });
    },
  };
}

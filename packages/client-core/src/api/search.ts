import type { UserBrief } from '@qyra/shared';
import { http, API_VERSION } from './http-client';

/**  */
export interface SearchApi {
  searchUsers: (params: { keyword: string; limit?: number }) => Promise<UserBrief[]>;
  // getUserById: (id: string) => Promise<User>;
  // updateUserProfile: (data: Partial<User>) => Promise<User>;
  // getUserSettings: () => Promise<UserSettings>;
  // updateUserSettings: (data: Partial<UserSettings>) => Promise<UserSettings>;
}

export function createSearchApi(version = API_VERSION.V1): SearchApi {
  return {
    async searchUsers(params: { keyword: string; limit?: number }) {
      return http.get<UserBrief[]>(`${version}/users/search`, { params });
    },
  };
}

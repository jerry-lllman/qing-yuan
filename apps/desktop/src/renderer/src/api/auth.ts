/**
 * Auth API 实例
 * 使用 client-core 的 createAuthApi 工厂函数，内置 Zod 验证
 */

import { createAuthApi, getHttpClient } from '@qyra/client-core';

/**
 * Auth API 实例
 * 内置 Zod schema 验证，desktop/mobile 共用同一验证逻辑
 */
export const authApi = createAuthApi(getHttpClient);

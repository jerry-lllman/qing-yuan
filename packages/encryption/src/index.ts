/**
 * @qing-yuan/encryption
 *
 * 端到端加密模块，基于 Signal Protocol 实现
 *
 * 主要功能：
 * - 密钥生成与管理（Identity Key, Pre-Keys, Signed Pre-Key）
 * - 会话建立与管理（X3DH 密钥协商）
 * - 消息加解密（Double Ratchet 算法）
 * - 密钥存储接口（可适配不同存储后端）
 */

// 类型定义
export * from './types';

// 密钥管理
export * from './keys';

// 会话管理
export * from './session';

// 持久化存储
export * from './stores';

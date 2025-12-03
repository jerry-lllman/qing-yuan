/**
 * 验证工具函数
 */

import { Limits } from '../constants/limits.js';

/**
 * 验证用户名格式
 * - 3-20 个字符
 * - 只能包含字母、数字、下划线
 * - 必须以字母开头
 */
export function isValidUsername(username: string): boolean {
  const regex = new RegExp(
    `^[a-zA-Z][a-zA-Z0-9_]{${Limits.USERNAME_MIN_LENGTH - 1},${Limits.USERNAME_MAX_LENGTH - 1}}$`
  );
  return regex.test(username);
}

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * 验证密码强度
 * - 至少 8 个字符
 * - 包含大写字母、小写字母、数字
 */
export function isValidPassword(password: string): boolean {
  if (
    password.length < Limits.PASSWORD_MIN_LENGTH ||
    password.length > Limits.PASSWORD_MAX_LENGTH
  ) {
    return false;
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);

  return hasUpperCase && hasLowerCase && hasNumbers;
}

/**
 * 验证手机号（中国大陆）
 */
export function isValidPhone(phone: string): boolean {
  const regex = /^1[3-9]\d{9}$/;
  return regex.test(phone);
}

/**
 * 检查是否为空字符串（去除空格后）
 */
export function isEmptyString(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}

/**
 * 验证 UUID 格式
 */
export function isValidUUID(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

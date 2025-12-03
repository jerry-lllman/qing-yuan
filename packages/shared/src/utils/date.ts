/**
 * 日期时间工具函数
 */

/**
 * 格式化相对时间
 * @example formatRelativeTime(new Date()) // "刚刚"
 * @example formatRelativeTime(new Date(Date.now() - 60000)) // "1分钟前"
 */
export function formatRelativeTime(date: Date | string | number): string {
  const now = Date.now();
  const target = new Date(date).getTime();
  const diff = now - target;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return '刚刚';
  }
  if (minutes < 60) {
    return `${minutes}分钟前`;
  }
  if (hours < 24) {
    return `${hours}小时前`;
  }
  if (days < 7) {
    return `${days}天前`;
  }

  return formatDate(date);
}

/**
 * 格式化日期
 * @example formatDate(new Date()) // "2024-01-01"
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化时间
 * @example formatTime(new Date()) // "14:30"
 */
export function formatTime(date: Date | string | number): string {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 格式化日期时间
 * @example formatDateTime(new Date()) // "2024-01-01 14:30"
 */
export function formatDateTime(date: Date | string | number): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * 格式化消息时间（用于聊天列表）
 * 今天显示时间，昨天显示"昨天"，其他显示日期
 */
export function formatMessageTime(date: Date | string | number): string {
  const target = new Date(date);
  const now = new Date();

  const isToday =
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate();

  if (isToday) {
    return formatTime(date);
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    target.getFullYear() === yesterday.getFullYear() &&
    target.getMonth() === yesterday.getMonth() &&
    target.getDate() === yesterday.getDate();

  if (isYesterday) {
    return '昨天';
  }

  // 同一年只显示月日
  if (target.getFullYear() === now.getFullYear()) {
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  }

  return formatDate(date);
}

/**
 * 格式化工具函数
 */

/**
 * 格式化文件大小
 * @example formatFileSize(1024) // "1 KB"
 * @example formatFileSize(1048576) // "1 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * 格式化时长（秒转分:秒）
 * @example formatDuration(65) // "01:05"
 * @example formatDuration(3661) // "01:01:01"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * 截断文本
 * @example truncate("Hello World", 5) // "Hello..."
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + suffix;
}

/**
 * 格式化数量（大数字简写）
 * @example formatCount(1234) // "1234"
 * @example formatCount(12345) // "1.2万"
 * @example formatCount(123456789) // "1.2亿"
 */
export function formatCount(count: number): string {
  if (count < 10000) {
    return String(count);
  }
  if (count < 100000000) {
    return `${(count / 10000).toFixed(1)}万`;
  }
  return `${(count / 100000000).toFixed(1)}亿`;
}

/**
 * 生成随机颜色（用于头像占位）
 */
export function generateAvatarColor(seed: string): string {
  const colors = [
    '#F44336',
    '#E91E63',
    '#9C27B0',
    '#673AB7',
    '#3F51B5',
    '#2196F3',
    '#03A9F4',
    '#00BCD4',
    '#009688',
    '#4CAF50',
    '#8BC34A',
    '#CDDC39',
    '#FFC107',
    '#FF9800',
    '#FF5722',
  ];

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length] ?? colors[0]!;
}

/**
 * 获取名字的首字母/字（用于头像占位）
 */
export function getNameInitials(name: string): string {
  if (!name) return '?';

  // 如果是中文，取第一个字
  if (/[\u4e00-\u9fa5]/.test(name)) {
    return name.charAt(0);
  }

  // 英文取前两个单词首字母
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0]!.charAt(0) + words[1]!.charAt(0)).toUpperCase();
  }

  return name.charAt(0).toUpperCase();
}

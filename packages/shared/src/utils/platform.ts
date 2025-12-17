/**
 * 平台检测工具函数
 *
 * 用于检测当前运行环境的操作系统平台
 * 支持浏览器环境和 Node.js 环境
 */

// 声明全局类型以避免依赖 @types/node 或 lib: ["dom"]
declare const navigator: { platform: string; userAgentData?: { platform?: string } } | undefined;
declare const process: { platform: string } | undefined;

/**
 * 支持的平台枚举
 */
export enum Platform {
  MAC = 'mac',
  WINDOWS = 'windows',
  LINUX = 'linux',
  UNKNOWN = 'unknown',
}

/**
 * 获取当前平台
 *
 * 优先使用 navigator.userAgentData（现代浏览器）
 * 回退到 navigator.platform（旧浏览器）
 * 最后尝试 Node.js 的 process.platform
 *
 * @returns 当前平台枚举值
 */
export function getPlatform(): Platform {
  // 浏览器环境
  if (typeof navigator !== 'undefined') {
    // 优先使用 User-Agent Client Hints API（现代浏览器）
    if (navigator.userAgentData?.platform) {
      const platform = navigator.userAgentData.platform.toLowerCase();
      if (platform.includes('mac')) return Platform.MAC;
      if (platform.includes('win')) return Platform.WINDOWS;
      if (platform.includes('linux')) return Platform.LINUX;
    }

    // 回退到 navigator.platform
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('mac')) return Platform.MAC;
    if (platform.includes('win')) return Platform.WINDOWS;
    if (platform.includes('linux')) return Platform.LINUX;
  }

  // Node.js 环境
  if (typeof process !== 'undefined' && process.platform) {
    const platform = process.platform;
    if (platform === 'darwin') return Platform.MAC;
    if (platform === 'win32') return Platform.WINDOWS;
    if (platform === 'linux') return Platform.LINUX;
  }

  return Platform.UNKNOWN;
}

/**
 * 判断当前是否为 macOS
 */
export function isMac(): boolean {
  return getPlatform() === Platform.MAC;
}

/**
 * 判断当前是否为 Windows
 */
export function isWindows(): boolean {
  return getPlatform() === Platform.WINDOWS;
}

/**
 * 判断当前是否为 Linux
 */
export function isLinux(): boolean {
  return getPlatform() === Platform.LINUX;
}

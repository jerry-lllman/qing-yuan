import type { ElectronAPI } from '@electron-toolkit/preload';

interface WindowControls {
  /** 最小化当前窗口 */
  minimize: () => void;
  /** 最大化/还原当前窗口 */
  maximize: () => void;
  /** 关闭当前窗口 */
  close: () => void;
  /** 查询窗口是否最大化 */
  isMaximized: () => Promise<boolean>;

  /**
   * 打开主窗口并关闭认证窗口
   * 登录/注册成功后调用此方法切换到主界面
   */
  openMainWindow: () => void;

  /**
   * 打开认证窗口并关闭主窗口
   * 登出后调用此方法返回登录页面
   */
  openAuthWindow: () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    api: unknown;
    windowControls: WindowControls;
  }
}

import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// Custom APIs for renderer
const api = {};

/**
 * 窗口控制 API
 * 提供窗口最小化、最大化、关闭等操作
 */
const windowControls = {
  /** 最小化当前窗口 */
  minimize: () => ipcRenderer.send('window-minimize'),
  /** 最大化/还原当前窗口 */
  maximize: () => ipcRenderer.send('window-maximize'),
  /** 关闭当前窗口 */
  close: () => ipcRenderer.send('window-close'),
  /** 查询窗口是否最大化 */
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  /**
   * 打开主窗口并关闭认证窗口
   * 登录/注册成功后调用此方法切换到主界面
   */
  openMainWindow: () => ipcRenderer.send('open-main-window'),

  /**
   * 打开认证窗口并关闭主窗口
   * 登出后调用此方法返回登录页面
   */
  openAuthWindow: () => ipcRenderer.send('open-auth-window'),
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
    contextBridge.exposeInMainWorld('windowControls', windowControls);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
  // @ts-ignore (define in dts)
  window.windowControls = windowControls;
}

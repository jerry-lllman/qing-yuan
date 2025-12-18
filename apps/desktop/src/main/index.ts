import { app, shell, BrowserWindow, ipcMain, session } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';

/**
 * 配置 Content Security Policy
 * 开发环境允许 localhost 和 Vite HMR，生产环境使用严格策略
 */
function setupContentSecurityPolicy(): void {
  // 开发模式下不设置 CSP，允许 Vite HMR 正常工作
  // 生产模式下使用严格的 CSP
  if (is.dev) {
    // 开发环境：不拦截，使用默认行为
    return;
  }

  // 生产环境：设置严格 CSP
  const allowedOrigins = [process.env.API_URL, process.env.WS_URL].filter(Boolean);

  const connectSrc = ["'self'", ...allowedOrigins].join(' ');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self'; ` +
            `script-src 'self'; ` +
            `style-src 'self' 'unsafe-inline'; ` +
            `img-src 'self' data: https:; ` +
            `font-src 'self' data:; ` +
            `connect-src ${connectSrc}`,
        ],
      },
    });
  });
}

// ============================================================================
// 窗口管理
// ============================================================================

/** 认证窗口引用 (登录/注册小窗) */
let authWindow: BrowserWindow | null = null;

/** 主窗口引用 (聊天大窗) */
let mainWindow: BrowserWindow | null = null;

/** 当前活动窗口类型 */
type ActiveWindow = 'auth' | 'main';
let activeWindowType: ActiveWindow = 'auth';

/**
 * 获取当前活动的窗口
 */
function getActiveWindow(): BrowserWindow | null {
  return activeWindowType === 'auth' ? authWindow : mainWindow;
}

/**
 * 创建认证窗口 (登录/注册)
 * 小窗口尺寸：400x520
 */
function createAuthWindow(): void {
  authWindow = new BrowserWindow({
    width: 400,
    height: 520,
    resizable: false,
    show: false,
    autoHideMenuBar: true,
    // 跨平台无边框窗口配置
    ...(process.platform === 'darwin'
      ? {
          titleBarStyle: 'hiddenInset',
          trafficLightPosition: { x: 12, y: 12 },
        }
      : {
          frame: false,
        }),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  authWindow.on('ready-to-show', () => {
    authWindow?.show();
  });

  authWindow.on('closed', () => {
    authWindow = null;
    // 如果主窗口不存在且认证窗口关闭，退出应用
    if (!mainWindow && process.platform !== 'darwin') {
      app.quit();
    }
  });

  authWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // 加载认证页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    authWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/auth.html`);
  } else {
    authWindow.loadFile(join(__dirname, '../renderer/auth.html'));
  }

  activeWindowType = 'auth';
}

/**
 * 创建主窗口 (聊天界面)
 * 大窗口尺寸：900x670
 */
function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    // 跨平台无边框窗口配置
    ...(process.platform === 'darwin'
      ? {
          titleBarStyle: 'hiddenInset',
          trafficLightPosition: { x: 4, y: 4 },
        }
      : {
          frame: false,
        }),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // 加载主页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  activeWindowType = 'main';
}

// ============================================================================
// 应用初始化
// ============================================================================

app.whenReady().then(() => {
  // 设置 CSP（必须在窗口创建前）
  setupContentSecurityPolicy();

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.qyra');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on('ping', () => console.log('pong'));

  // =========================================================================
  // 窗口控制 IPC
  // =========================================================================

  // 最小化当前活动窗口
  ipcMain.on('window-minimize', () => {
    getActiveWindow()?.minimize();
  });

  // 最大化/还原当前活动窗口
  ipcMain.on('window-maximize', () => {
    const win = getActiveWindow();
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  // 关闭当前活动窗口
  ipcMain.on('window-close', () => {
    getActiveWindow()?.close();
  });

  // 查询窗口是否最大化
  ipcMain.handle('window-is-maximized', () => {
    return getActiveWindow()?.isMaximized() ?? false;
  });

  // =========================================================================
  // 窗口切换 IPC - 登录成功后切换到主窗口
  // =========================================================================

  /**
   * 打开主窗口并关闭认证窗口
   * 由渲染进程在登录/注册成功后调用
   */
  ipcMain.on('open-main-window', () => {
    // 创建主窗口
    createMainWindow();
    // 关闭认证窗口
    authWindow?.close();
  });

  /**
   * 打开认证窗口并关闭主窗口
   * 用于登出后返回登录页面
   */
  ipcMain.on('open-auth-window', () => {
    // 创建认证窗口
    createAuthWindow();
    // 关闭主窗口
    mainWindow?.close();
  });

  // 启动时创建认证窗口
  createAuthWindow();

  app.on('activate', function () {
    // macOS: 点击 dock 图标时重新创建窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      // 根据是否有登录状态决定打开哪个窗口
      // TODO: 检查本地存储的登录状态
      createAuthWindow();
    }
  });
});

// 所有窗口关闭时退出应用 (macOS 除外)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

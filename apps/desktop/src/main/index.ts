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

// 存储主窗口引用，用于 IPC 通信
let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    // 跨平台无边框窗口配置
    // macOS: 使用 hiddenInset 保留原生红绿灯按钮
    // Windows/Linux: 完全无边框，需要自定义窗口控制按钮
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

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // 设置 CSP（必须在窗口创建前）
  setupContentSecurityPolicy();

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.qyra');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on('ping', () => console.log('pong'));

  // 窗口控制 IPC
  ipcMain.on('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow?.isMaximized() ?? false;
  });

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

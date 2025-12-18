import { resolve } from 'path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src'),
      },
    },
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        // 多入口配置：主窗口 (index.html) + 认证窗口 (auth.html)
        input: {
          main: resolve('src/renderer/index.html'),
          auth: resolve('src/renderer/auth.html'),
        },
        // 将 Signal 加密库外部化，因为它使用 Node.js 原生模块
        // 在 Electron renderer 中通过 preload 脚本访问
        external: ['@signalapp/libsignal-client', '@qyra/encryption'],
      },
    },
  },
});

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  plugins: [
    // @ts-expect-error - unplugin-swc 与 vitest 的 vite 版本类型不兼容，运行时正常
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});

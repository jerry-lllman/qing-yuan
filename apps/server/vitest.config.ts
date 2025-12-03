import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
    environment: 'node',
    passWithNoTests: true,
  },
  plugins: [
    // 使用 SWC 编译，支持 Nest.js 装饰器
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});

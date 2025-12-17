import { defineConfig } from 'tsup';

const isWatch = process.argv.includes('--watch');

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: !isWatch, // watch 模式下不清理，避免与其他 dev 任务的竞态条件
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: ['@signalapp/libsignal-client'],
});

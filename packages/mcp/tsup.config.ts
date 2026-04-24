import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  outDir: 'dist',
  minify: false,
  dts: true,
  outExtension: () => ({ js: '.mjs' }),
});

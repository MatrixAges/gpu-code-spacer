import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  base: './',
  build: { outDir: '../web-dist', emptyOutDir: true },
  worker: { format: 'es' },
});

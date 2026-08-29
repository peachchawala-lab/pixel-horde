import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 3000,
  },
  build: {
    assetsInlineLimit: 0,
    target: 'esnext'
  }
});

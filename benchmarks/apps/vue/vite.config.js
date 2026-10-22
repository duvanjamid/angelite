import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: './',
  root: new URL('.', import.meta.url).pathname,
  plugins: [vue()],
  build: { outDir: '../../dist/vue', emptyOutDir: true, minify: 'esbuild', modulePreload: false }
});

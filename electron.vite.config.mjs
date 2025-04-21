import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [viteCommonjs()]
  }
});

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import mkcert from 'vite-plugin-mkcert';
import { writeFileSync } from 'fs';

const versionJsonPlugin = {
  name: 'version-json',
  buildStart() {
    writeFileSync('public/version.json', JSON.stringify({ v: Date.now() }));
  },
};

export default defineConfig({
  plugins: [vue(), mkcert(), versionJsonPlugin],
  server: {
    port: 5173,
    https: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function injectServiceWorkerVersion(): Plugin {
  return {
    name: 'inject-service-worker-version',
    apply: 'build',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/service-worker.js');
      if (!fs.existsSync(swPath)) return;
      const version = `${Date.now()}`;
      const original = fs.readFileSync(swPath, 'utf-8');
      const replaced = original.replace(/__BUILD_VERSION__/g, version);
      fs.writeFileSync(swPath, replaced);
    },
  };
}

export default defineConfig({
  plugins: [react(), injectServiceWorkerVersion()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
  },
});

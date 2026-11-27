import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
// Cloud previews are reached through a per-session hostname, and Vite rejects
// unknown Host headers. Pass that exact hostname in PREVIEW_ALLOWED_HOST
// (comma-separated for several) instead of hard-coding a VM address.
const previewHosts = (process.env.PREVIEW_ALLOWED_HOST ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    ...(previewHosts.length > 0 ? { allowedHosts: previewHosts } : {}),
    proxy: {
      '/api/v1': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});

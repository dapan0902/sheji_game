import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Vercel 部署使用根路径
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: true,
    allowedHosts: [
      '.ngrok-free.app',
      '.ngrok-free.dev',
      '.ngrok.io',
      '.ngrok.app'
    ],
    hmr: {
      clientPort: 443
    }
  }
});


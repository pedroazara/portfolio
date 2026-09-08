import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, '.') } },
  build: { rollupOptions: { output: { manualChunks: { 'vendor-react': ['react', 'react-dom', 'react-router-dom'], 'vendor-pdf': ['jspdf', 'qrcode'], 'vendor-monitoring': ['@sentry/react'] } } } },
  server: { hmr: process.env.DISABLE_HMR !== 'true', watch: process.env.DISABLE_HMR === 'true' ? null : {} },
});

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  base: '/landing-assets/',
  publicDir: 'public',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../site/landing',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'landing-[hash].js',
        chunkFileNames: 'chunk-[hash].js',
        assetFileNames: (assetInfo) => assetInfo.name?.endsWith('.css')
          ? 'landing-[hash].css'
          : '[name]-[hash][extname]',
      },
    },
  },
});

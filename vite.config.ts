import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Root base path for custom domain https://hs.geri.io/
  base: '/',
  server: {
    port: 5173,
    strictPort: false,
  },
});

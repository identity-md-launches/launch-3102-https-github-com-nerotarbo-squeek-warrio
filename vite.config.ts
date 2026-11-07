import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps every asset URL relative so the export works on a gateway subpath or ENS name.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});

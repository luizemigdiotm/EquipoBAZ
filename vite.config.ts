import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: "/equipobaz/",
  resolve: {
    alias: [
      // Changed from '@' to '@/' to avoid conflicts with npm packages starting with @ (like @supabase)
      { find: '@/', replacement: '/src/' }

    ]
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
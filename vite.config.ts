import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isServe = command === 'serve';
  return {
    plugins: [react()],
    base: isServe ? '/' : './', // Use absolute path for dev and relative for build
    server: {
      watch: {
        ignored: ['**/*.json', '**/*.db*', '**/*.sqlite*', '**/data/**'],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});

import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts'],
    exclude: ['tests/e2e/**']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});



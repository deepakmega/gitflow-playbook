import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testMatch: '**/tests/**/*.test.js',
  },
});

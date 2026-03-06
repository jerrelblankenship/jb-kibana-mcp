import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Load .env so integration tests pick up KIBANA_URL etc.
// Shell env vars take precedence (dotenv does not override existing vars).
dotenv.config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/integration/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 30_000,
  },
});

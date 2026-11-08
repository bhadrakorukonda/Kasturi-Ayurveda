import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // One in-memory MongoDB for the whole run; every test file gets its own
    // database on it (see tests/helpers/testApp.ts).
    globalSetup: ['tests/globalSetup.ts'],
    // Each file imports the app fresh with its own env (e.g. payments on/off).
    isolate: true,
    // Files run one after another: simpler output, and the concurrency
    // tests inside a file aren't competing with other files for CPU.
    fileParallelism: false,
    testTimeout: 30_000,
    // First run downloads a MongoDB binary for mongodb-memory-server.
    hookTimeout: 300_000,
  },
});

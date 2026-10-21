import { defineConfig } from 'vitest/config';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const rtlPath = path.dirname(require.resolve('@testing-library/react/package.json'));
const sharedReactDir = path.dirname(require.resolve('react/package.json', { paths: [rtlPath] }));
const sharedReactDomDir = path.dirname(require.resolve('react-dom/package.json', { paths: [rtlPath] }));

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/app/api/**/*.{ts,tsx}',
        'src/components/**/*.{ts,tsx}',
        'src/lib/**/*.{ts,tsx}',
      ],
      exclude: ['src/**/*.d.ts'],
      thresholds: {
        // Vitest 5's V8 provider reports a lower branch percentage than 2.x
        // for the same tests (41% vs 57% across this suite). Measured
        // 2026-10-21 with the chat/read-state test wave: 65.0 / 54.8 / 61.4 /
        // 66.7 — ratchets keep a ~1.5pt margin against regression.
        statements: 63,
        branches: 53,
        functions: 60,
        lines: 65,
      },

    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react/jsx-runtime': path.join(sharedReactDir, 'jsx-runtime.js'),
      'react/jsx-dev-runtime': path.join(sharedReactDir, 'jsx-dev-runtime.js'),
      'react-dom/client': path.join(sharedReactDomDir, 'client.js'),
      'react-dom': sharedReactDomDir,
      'react': sharedReactDir,
    },
  },
});

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
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/app/**', 'src/**/*.d.ts'],
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

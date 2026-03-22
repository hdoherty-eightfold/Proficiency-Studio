/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: './src/renderer',
  base: './',
  publicDir: '../../public',

  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,

    // Enable minification for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
    },

    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React dependencies
          'vendor-react': ['react', 'react-dom'],

          // State management
          'vendor-state': ['zustand'],

          // UI library components
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],

          // Icons (large, separate chunk)
          'vendor-icons': ['lucide-react'],

          // Utility libraries
          'vendor-utils': ['clsx', 'tailwind-merge', 'class-variance-authority'],
        },
      },
    },

    // Chunk size warnings
    chunkSizeWarningLimit: 500,

    // Generate source maps for debugging
    sourcemap: process.env.NODE_ENV !== 'production',

    // Target modern browsers for smaller bundles
    target: 'esnext',
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      '@/components': path.resolve(__dirname, './src/renderer/components'),
      '@/lib': path.resolve(__dirname, './src/renderer/lib'),
      '@/stores': path.resolve(__dirname, './src/renderer/stores'),
      '@/services': path.resolve(__dirname, './src/renderer/services'),
      '@/hooks': path.resolve(__dirname, './src/renderer/hooks'),
      '@/types': path.resolve(__dirname, './src/renderer/types'),
      '@/utils': path.resolve(__dirname, './src/renderer/utils'),
    },
  },

  server: {
    port: 5173,
  },

  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'zustand',
      'lucide-react',
      'clsx',
      'tailwind-merge',
    ],
  },

  // Vitest configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}', '../../src/main/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['**/*.{ts,tsx}'],
      exclude: [
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'test/**',
        'main.tsx',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
  },
});

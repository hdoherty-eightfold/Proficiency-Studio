/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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

    // Chunk splitting for better caching (Vite 8 / Rolldown: manualChunks must be a function)
    rolldownOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/zustand')) {
            return 'vendor-state';
          }
          if (id.includes('node_modules/@radix-ui/react-dialog') ||
              id.includes('node_modules/@radix-ui/react-dropdown-menu') ||
              id.includes('node_modules/@radix-ui/react-popover') ||
              id.includes('node_modules/@radix-ui/react-select') ||
              id.includes('node_modules/@radix-ui/react-tabs') ||
              id.includes('node_modules/@radix-ui/react-toast') ||
              id.includes('node_modules/@radix-ui/react-tooltip')) {
            return 'vendor-radix';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/clsx') ||
              id.includes('node_modules/tailwind-merge') ||
              id.includes('node_modules/class-variance-authority')) {
            return 'vendor-utils';
          }
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
        lines: 35,
        functions: 30,
        branches: 25,
        statements: 35,
      },
    },
  },
});

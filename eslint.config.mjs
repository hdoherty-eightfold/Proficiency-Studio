import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'eslint.config.mjs',
      'tailwind.config.js',
      'postcss.config.js',
      'scripts/**',
      'test*.js',
    ],
  },

  // Base JS rules (non-TS files only)
  {
    ...js.configs.recommended,
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
  },

  // TypeScript + React renderer source files
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    ignores: ['src/renderer/**/*.test.{ts,tsx}', 'src/renderer/test/**'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
      ...reactHooks.configs.recommended.rules,
      // Disable overly-strict react-hooks v5 rules that flag common valid patterns
      'react-hooks/purity': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // TypeScript handles undefined references better than ESLint
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },

  // UI component files — disable react-refresh export rule (shadcn/radix pattern exports variants alongside components)
  {
    files: ['src/renderer/components/ui/**/*.{ts,tsx}', 'src/renderer/components/common/ErrorBoundary.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // Electron main process + preload (Node.js environment)
  {
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts'],
    ignores: ['src/main/**/*.test.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },

  // Test files — relax rules
  {
    files: [
      'src/**/*.test.{ts,tsx}',
      'src/renderer/test/**/*.{ts,tsx}',
      'e2e/**/*.{ts,tsx}',
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
      'react-refresh/only-export-components': 'off',
      'react-hooks/rules-of-hooks': 'warn',
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
];

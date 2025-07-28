import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import markdown from '@eslint/markdown';
import css from '@eslint/css';
import { defineConfig, globalIgnores } from 'eslint/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { includeIgnoreFile } from '@eslint/compat';
import stylistic from '@stylistic/eslint-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  // Ignore patterns
  includeIgnoreFile(path.resolve(__dirname, '.gitignore')),
  globalIgnores([
    'node_modules/**',
    '**/dist/**',
    '**/dist-ssr/**',
    '**/coverage/**',
    'build/**',
    '.git/**',
    '*.min.js',
    '*.min.css',
  ]),

  { files: ['**/*.md'], plugins: { markdown }, language: 'markdown/gfm', extends: ['markdown/recommended'] },
  { files: ['**/*.css'], plugins: { css }, language: 'css/css', extends: ['css/recommended'] },
  // Base JavaScript configuration
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js }, extends: ['js/recommended'],
  },
  // TypeScript configuration
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.{ts,mts,cts}'],
  })),
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  {
    ...stylistic.configs.customize({
      semi: true,
      arrowParens: true,
      braceStyle: '1tbs',
    }),
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'],
    rules: {
      'no-useless-computed-key': ['error'],
      'no-console': ['warn'],
      '@stylistic/no-multi-spaces': ['error', { ignoreEOLComments: true }],
      '@stylistic/space-before-function-paren': ['error', 'always'],
      '@stylistic/function-call-spacing': ['error'],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'src/*',
          ],
        },
      ],
    },
  },
]);

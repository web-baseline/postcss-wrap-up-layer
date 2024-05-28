/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution');
const stylistic = require('@stylistic/eslint-plugin');

const customized = stylistic.configs.customize({
  semi: true,
  arrowParens: true,
  braceStyle: '1tbs',
});

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    '@stylistic',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  ignorePatterns: [
    'dist',
  ],
  rules: {
    ...customized.rules,
    'no-useless-computed-key': ['error'],
    'no-console': ['warn'],
    '@stylistic/no-multi-spaces': ['error', { ignoreEOLComments: true }],
    '@stylistic/space-before-function-paren': ['error'],
    '@stylistic/function-call-spacing': ['error'],
  },
  overrides: [
    {
      files: ['*.js', '*.cjs', '*.mjs'],
      parser: 'espree',
    },
    {
      files: ['*.js', '*.cjs'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};

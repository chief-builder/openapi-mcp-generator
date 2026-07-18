// Flat config (ESLint 9 + typescript-eslint 8).
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'output/**', '**/*.template', 'src/test/e2e/**'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // The generator manipulates loosely-typed OpenAPI documents; `any` is pragmatic here.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
);

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: ['eslint:recommended', '@typescript-eslint/recommended', 'prettier'],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['dist/', '**/dist/', '.eslintrc.js', 'node_modules/', '.medusa/', '*.d.ts'],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1, maxBOF: 0 }],
    'no-trailing-spaces': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    'prettier/prettier': ['error', {}, { usePrettierrc: true }],
  },
};

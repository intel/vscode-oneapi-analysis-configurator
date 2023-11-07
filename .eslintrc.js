module.exports = {
  env: {
    node: true,
    es2021: true
  },
  extends: [
    'standard'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  plugins: [
    '@typescript-eslint'
  ],
  rules: {
    'no-template-curly-in-string': 'off',
    'no-tabs': 'off',
    'no-mixed-spaces-and-tabs': 'off',
    semi: ['error', 'always'],
    'space-before-function-paren': ['error', 'never'],
    'no-redeclare': 'warn',
    'no-throw-literal': 'warn',
    'no-unused-expressions': 'warn',
    indent: ['error', 2],
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single'],
    'no-empty': 'warn',
    'no-cond-assign': ['error', 'always'],
    'for-direction': 'off',
    'newline-after-var': ['error', 'always'],
    'object-curly-spacing': ['error', 'always']
  }
};

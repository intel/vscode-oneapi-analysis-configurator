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
    'space-before-function-paren': ['error', 'never']
  }
};

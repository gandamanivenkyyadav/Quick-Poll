module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: ['react'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // You can customize rules here
    'react/react-in-jsx-scope': 'off', // with React 17+ JSX transform
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};

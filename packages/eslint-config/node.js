import baseConfig from './base.js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(...baseConfig, {
  languageOptions: {
    globals: {
      ...globals.node,
    },
  },
  rules: {
    'no-console': 'off',
  },
});

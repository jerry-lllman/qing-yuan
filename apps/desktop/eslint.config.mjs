import reactConfig from '@qyra/eslint-config/react'
import eslintPluginReactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['**/node_modules', '**/dist', '**/out'] },
  ...reactConfig,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-refresh': eslintPluginReactRefresh,
    },
    rules: {
      ...eslintPluginReactRefresh.configs.vite.rules,
    },
  },
]

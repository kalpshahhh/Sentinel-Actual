import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // React Compiler advisory hints — flag legitimate patterns (deriving
      // state from props, initialising from external sources, manual
      // memoization) that work correctly but aren't auto-optimisable.
      // Downgrade to warnings so genuine errors surface clearly.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      // react-refresh complains when a component file also exports a const
      // or helper. We co-locate small helpers with their components.
      'react-refresh/only-export-components': 'warn',
    },
  },
])

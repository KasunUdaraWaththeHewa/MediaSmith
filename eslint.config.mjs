import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const nodeGlobals = {
  Buffer: 'readonly',
  __dirname: 'readonly',
  console: 'readonly',
  module: 'readonly',
  process: 'readonly',
  require: 'readonly'
};

export default defineConfig(
  { ignores: ['**/dist/**', '**/node_modules/**'] },
  {
    files: ['packages/**/src/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended]
  },
  {
    files: ['packages/**/test/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: nodeGlobals }
  }
);

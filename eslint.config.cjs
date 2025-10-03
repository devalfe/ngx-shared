// eslint.config.cjs
const tseslint = require('typescript-eslint');
const importPlugin = require('eslint-plugin-import');
const unusedImports = require('eslint-plugin-unused-imports');
const prettier = require('eslint-plugin-prettier');

module.exports = [
  // Ignorados (reemplaza .eslintignore)
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/docs/**',
      '**/.angular/**',
      'node_modules/**',
      '**/*.d.ts',
      '**/*.min.js',
    ],
  },

  // 1) Con chequeo de tipos para apps/libs
  ...tseslint.configs.recommendedTypeChecked.map((cfg) => ({
    ...cfg,
    files: ['projects/**/*.ts', 'apps/**/*.ts'],
    languageOptions: {
      ...cfg.languageOptions,
      parserOptions: {
        ...cfg.languageOptions?.parserOptions,
        project: ['./tsconfig.eslint.json'], // <- incluye tus archivos de código
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports,
      prettier,
      ...(cfg.plugins || {}),
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: ['tsconfig.base.json', 'projects/**/tsconfig*.json', 'apps/**/tsconfig*.json'],
        },
      },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'import/no-unresolved': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'prettier/prettier': ['error'],
    },
  })),

  // 2) Sin tipos para configs/scripts sueltos en raíz y tools
  ...tseslint.configs.recommended.map((cfg) => ({
    ...cfg,
    files: ['*.ts', '*.cjs', '*.mjs', '*.js', 'tools/**/*.ts', 'scripts/**/*.ts'],
    // OJO: NO poner project aquí → evita el error
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports,
      prettier,
      ...(cfg.plugins || {}),
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'unused-imports/no-unused-imports': 'warn',
      'prettier/prettier': ['error'],
    },
  })),
];

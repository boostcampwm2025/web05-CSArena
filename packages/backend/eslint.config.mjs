// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import pluginImport from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['dist/', 'node_modules/', 'eslint.config.mjs', '**/test/**',
            '**/*.spec.ts',
            '**/*.test.ts',
            'jest.config.ts',
            'src/quiz/test-quiz.ts',
            'src/quiz/test-question-service.ts'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.jest,
            },
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        settings: {
            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                    project: './tsconfig.json',
                },
                node: true,
            },
        },
        plugins: {
            import: pluginImport,
        },
        rules: {
            'curly': ['error', 'all'],
            'padding-line-between-statements': [
                'error',
                {
                    blankLine: 'always',
                    next: ['if', 'for', 'while', 'do', 'switch', 'try'],
                    prev: ['*'],
                },
                {
                    blankLine: 'always',
                    next: ['*'],
                    prev: ['if', 'for', 'while', 'do', 'switch', 'try', 'break', 'continue'],
                },
                {blankLine: 'always', next: ['function', 'class'], prev: '*'},
                {blankLine: 'always', next: '*', prev: ['function', 'class']},
                {blankLine: 'always', next: 'return', prev: '*'},
            ],
            'prettier/prettier': ['error', {}, {usePrettierrc: true}],
            'import/exports-last': 'error',
            'import/newline-after-import': ['error', {count: 1}],
            'sort-imports': ['error', {ignoreCase: true, ignoreDeclarationSort: true}],
            'no-console': 'warn',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-floating-promises': 'warn',
            '@typescript-eslint/no-unsafe-argument': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    varsIgnorePattern: '^_',
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
        },
    },
    {
        files: ['**/*.spec.ts', '**/*.test.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    }
);
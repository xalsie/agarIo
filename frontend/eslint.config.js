import config from 'eslint-config-xo';
import {defineConfig} from 'eslint/config';

export default defineConfig([
    config,
    {
        files: ['*.js'],
        rules: {
            'no-console': 'off',
            'no-unused-vars': 'off',
            '@stylistic/indent': ['error', 'tab'], // Ajoute cette ligne pour forcer les tabulations
        },
    },
]);

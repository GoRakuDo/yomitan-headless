import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        // Only our own tests: vendor/yomitan ships a large Playwright/Vitest suite
        // that must never be picked up here.
        include: ['test/**/*.test.ts'],
        environment: 'node',
        watch: false,
        // `kanji-processor` ships JSON imports without import attributes; let Vite
        // transform it instead of handing it to native Node ESM.
        server: {deps: {inline: ['kanji-processor']}},
    },
});

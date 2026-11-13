import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setup-tests.ts',
        // Keep e2e Playwright specs (./e2e) out of Vitest
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
})
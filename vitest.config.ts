import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // coverage: {
    //  provider: 'v8',
    //  reporter: ['text'],
    //  include: ['src/**/*.{ts,tsx}'],
    //  exclude: ['**/*.d.ts', '**/*.config.*', '**/layout.tsx'],
    //  thresholds: {
    //   lines: 90,
    // },
    //}
  },
})

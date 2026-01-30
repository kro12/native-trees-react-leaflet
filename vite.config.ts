import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const analyze = mode === 'analyze' || process.env.ANALYZE === 'true'

  return {
    plugins: [
      react(),
      ...(analyze
        ? [
            visualizer({
              filename: 'dist/stats.html',
              template: 'treemap',
              gzipSize: true,
              brotliSize: true,
              open: true,
            }),
          ]
        : []),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            leaflet: ['leaflet', 'react-leaflet', 'react-leaflet-cluster'],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: resolve(__dirname, 'tests/setup.ts'),
    },
  }
})

import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(fileURLToPath(import.meta.url))

const src = (p: string) => path.resolve(root, 'src', p)

export default defineConfig({
  resolve: {
    alias: {
      '@modules': src('modules'),
      '@config': src('config'),
      '@constants': src('constants'),
      '@exceptions': src('exceptions'),
      '@middlewares': src('middlewares'),
      '@utils': src('utils'),
      '@interfaces': src('interfaces'),
      '@entity': src('entity'),
      '@types': src('types'),
      '@jobs': src('jobs'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    setupFiles: ['tests/setup.ts'],
    // One shared database: run files one after another.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
})

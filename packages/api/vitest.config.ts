import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    env: {
      NODE_ENV: 'test',
      AUTH_RATE_LIMIT_MAX: '1000',
      JWT_SECRET: 'secreto-de-pruebas-resttek-0123456789abcdef'
    }
  }
})

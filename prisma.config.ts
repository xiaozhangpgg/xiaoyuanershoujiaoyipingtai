import { config } from 'dotenv'
config({ path: '.env.local' })
import { defineConfig, env } from '@prisma/config'

export default defineConfig({
  migrations: {
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})

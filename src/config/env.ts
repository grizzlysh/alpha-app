import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().trim().url(),
  JWT_SECRET: z.string().trim().min(10),
  CLIENT_URL: z.string().trim().url().default('http://localhost:5175'),
  PORT: z.string().trim().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Number of reverse proxies in front of the API (nginx, Cloudflare...). Needed
  // so rate limiting sees the client IP, not the proxy's. 0 = none.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
}).superRefine((v, ctx) => {
  if (v.NODE_ENV === 'production' && v.JWT_SECRET.length < 32) {
    ctx.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'Must be at least 32 characters in production' })
  }
})

type EnvSchema = z.infer<typeof envSchema>

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env: EnvSchema = parsed.data
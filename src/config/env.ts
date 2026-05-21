import { z, ZodObject, ZodRawShape } from 'zod'

const envSchema: ZodObject<ZodRawShape> = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(10),
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

type EnvSchema = z.infer<typeof envSchema>

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env: EnvSchema = parsed.data
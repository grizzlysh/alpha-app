import 'dotenv/config'

/**
 * The test database: same server as DATABASE_URL, database name + "_test".
 * Tests never touch the development data.
 */
export function testDatabaseUrl(): string {
  const base = process.env.DATABASE_URL
  if (!base) throw new Error('DATABASE_URL is not set')
  const url = new URL(base)
  const name = url.pathname.replace(/^\//, '')
  if (!name) throw new Error('DATABASE_URL has no database name')
  url.pathname = '/' + (name.endsWith('_test') ? name : `${name}_test`)
  return url.toString()
}

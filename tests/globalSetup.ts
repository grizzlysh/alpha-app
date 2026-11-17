import { execSync } from 'child_process'
import { testDatabaseUrl } from './testDb'

// Bring the test database up to date (created on first run) and load the core
// seed (permissions, global roles, platform admin, system parameters). Nothing
// is wiped: every test creates its own uniquely named pharmacy and users.
export default function setup(): void {
  const env = { ...process.env, DATABASE_URL: testDatabaseUrl(), NODE_ENV: 'test' }
  const run = (cmd: string) => execSync(cmd, { env, stdio: 'pipe' })
  run('npx prisma migrate deploy')
  run('npm run --silent prisma:seed:core')
}

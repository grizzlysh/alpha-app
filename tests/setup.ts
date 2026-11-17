import { testDatabaseUrl } from './testDb'

// Runs before each test file imports the app, so @config/db connects to the test database.
process.env.DATABASE_URL = testDatabaseUrl()
process.env.NODE_ENV = 'test'

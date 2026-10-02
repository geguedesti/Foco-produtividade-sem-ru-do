import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL || 'postgres://not-configured:missing@127.0.0.1:5432/not-configured'

const pool = new Pool({
  connectionString,
  max: 1,
})

export const db = drizzle({ client: pool, schema })

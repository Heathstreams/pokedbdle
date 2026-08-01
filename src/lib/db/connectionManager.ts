import { neon } from '@neondatabase/serverless';

// Neon's serverless driver speaks HTTP per query — there is no persistent
// connection to manage, so a single lazily-created client is all we need.
let sql: ReturnType<typeof neon> | null = null;

function getClient() {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = any>(
  queryText: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getClient().query(queryText, params);
  return result as T[];
}

// Compatibility exports for existing call sites
export const dbConnectionManager = { query };
export const executeQuery = query;

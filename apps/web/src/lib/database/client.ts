import { PGlite, type QueryOptions, type Results } from '@electric-sql/pglite';
import { live, type PGliteWithLive } from '@electric-sql/pglite/live';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import * as schema from './schema';

/**
 * PGlite 0.3+ uses a different on-disk Postgres major than 0.2 — data dirs are
 * incompatible. We therefore boot on a NEW idb name and leave the legacy
 * `idb://haptic` untouched (readable by a future one-time importer, and never
 * corrupted by a partial upgrade).
 */
export const DB_NAME = 'idb://haptic-v2';
export const LEGACY_DB_NAME = 'idb://haptic';

type HapticPGlite = PGlite & PGliteWithLive;

let clientPromise: Promise<HapticPGlite> | null = null;
let dbInstance: PgliteDatabase<typeof schema> | null = null;

/**
 * Kick off (or reuse) the PGlite boot. Await this once in the root layout
 * before rendering anything that touches storage. Tests pass
 * `{ dataDir: 'memory://' }` to run against an in-memory database.
 */
export function initDatabase(options: { dataDir?: string } = {}): Promise<HapticPGlite> {
  clientPromise ??= PGlite.create({
    dataDir: options.dataDir ?? DB_NAME,
    extensions: { live }
  }).then((client) => {
    dbInstance = drizzle(client, { schema });
    return client;
  });
  return clientPromise;
}

/**
 * The drizzle instance. Only valid after `initDatabase()` resolved — the root
 * layout awaits it before rendering anything that touches storage, so app code
 * can call this synchronously. (Replaces the old `@ts-nocheck` Proxy that could
 * hand out Promises for property access before init.)
 */
export function getDb(): PgliteDatabase<typeof schema> {
  if (!dbInstance) {
    throw new Error('Database not initialized. Await initDatabase() during app bootstrap.');
  }
  return dbInstance;
}

/** Raw client accessors used by search and live queries. */
export const pgClient = {
  get: () => initDatabase(),
  exec: async (sql: string) => (await initDatabase()).exec(sql),
  query: async <T>(
    query: string,
    params?: unknown[],
    options?: QueryOptions
  ): Promise<Results<T>> => (await initDatabase()).query<T>(query, params, options),
  live: {
    query: async <T>(query: string, params?: unknown[], callback?: (res: Results<T>) => void) =>
      (await initDatabase()).live.query<T>(query, params, callback)
  }
};

/**
 * Detect a pre-0.3 database so the UI can offer an import instead of silently
 * starting empty. PGlite's IDBFS mounts at `/pglite/<name>`, which Emscripten
 * uses verbatim as the IndexedDB database name (verified against 0.5.x).
 */
export async function legacyDatabaseExists(): Promise<boolean> {
  if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') {
    return false;
  }
  const dbs = await indexedDB.databases();
  return dbs.some((d) => d.name === `/pglite/${LEGACY_DB_NAME.replace('idb://', '')}`);
}

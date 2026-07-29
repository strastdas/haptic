import type { PGlite } from '@electric-sql/pglite';
import seedSql from './seed.sql?raw';
import type { MigrationResult } from './migrations';

/**
 * Seeds the demo "Haptic" collection, but ONLY on a genuinely fresh database:
 * no migration history existed before this boot AND the collection table is
 * empty. A user who deletes the demo collection is never re-seeded.
 */
export async function seedIfFresh(client: PGlite, migration: MigrationResult): Promise<boolean> {
  if (!migration.firstRun) {
    return false;
  }

  const collections = await client.query('SELECT 1 FROM collection LIMIT 1');
  if (collections.rows.length > 0) {
    return false;
  }

  await client.exec(seedSql);
  return true;
}

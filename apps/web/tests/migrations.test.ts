import { describe, expect, it } from 'vitest';
import { initDatabase } from '@/database/client';
import { runMigrations } from '@/database/migrations';
import { seedIfFresh } from '@/database/seed';

describe('migrations runner', () => {
  it('applies all migrations once, is idempotent, and gates seeding', async () => {
    const client = await initDatabase({ dataDir: 'memory://' });

    // First run applies the full chain in order
    const first = await runMigrations(client);
    expect(first.firstRun).toBe(true);
    expect(first.appliedNow).toEqual(['0000_baseline', '0001_updated-at-trigger']);

    const tracked = await client.query<{ id: string }>(
      'SELECT id FROM haptic_migrations ORDER BY id'
    );
    expect(tracked.rows.map((r) => r.id)).toEqual(['0000_baseline', '0001_updated-at-trigger']);

    // Second run is a no-op
    const second = await runMigrations(client);
    expect(second.firstRun).toBe(false);
    expect(second.appliedNow).toEqual([]);

    // Seed only on a fresh database
    expect(await seedIfFresh(client, first)).toBe(true);
    const collections = await client.query<{ path: string }>('SELECT path FROM collection');
    expect(collections.rows).toEqual([{ path: '/Haptic' }]);
    const readme = await client.query(
      "SELECT 1 FROM entry WHERE path = '/Haptic/README.md' AND content ILIKE '%markdown%'"
    );
    expect(readme.rows).toHaveLength(1);

    // Never re-seed: not on later boots, and not even with firstRun forced
    expect(await seedIfFresh(client, second)).toBe(false);
    expect(await seedIfFresh(client, first)).toBe(false);
  });

  it('ports the legacy updated_at trigger', async () => {
    const client = await initDatabase({ dataDir: 'memory://' });
    await runMigrations(client);

    await client.query(
      "INSERT INTO collection (path, name, last_opened) VALUES ('/Trig', 'Trig', now()) ON CONFLICT DO NOTHING"
    );
    await client.query(
      `INSERT INTO entry (path, name, parent_path, collection_path, content)
       VALUES ('/Trig/a.md', 'a.md', '/Trig', '/Trig', 'before')`
    );

    const inserted = await client.query<{ updated_at: string }>(
      "SELECT updated_at FROM entry WHERE path = '/Trig/a.md'"
    );

    await new Promise((resolve) => setTimeout(resolve, 15));
    await client.query("UPDATE entry SET content = 'after' WHERE path = '/Trig/a.md'");

    const updated = await client.query<{ updated_at: string }>(
      "SELECT updated_at FROM entry WHERE path = '/Trig/a.md'"
    );

    expect(new Date(updated.rows[0].updated_at).getTime()).toBeGreaterThan(
      new Date(inserted.rows[0].updated_at).getTime()
    );
  });
});

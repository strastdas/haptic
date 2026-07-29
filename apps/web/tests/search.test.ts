import { beforeAll, describe, expect, it, vi } from 'vitest';

// searchEntries lives in @/utils, which re-exports the editor seam; stub it so
// the module graph loads headless (search itself never touches the editor).
vi.mock('@haptic/editor/store', () => ({
  editor: { subscribe: () => () => {} },
  setEditorContent: () => {}
}));

import { initDatabase } from '@/database/client';
import { runMigrations } from '@/database/migrations';
import { searchEntries } from '@/utils';

const COLLECTION = '/Search';

beforeAll(async () => {
  const client = await initDatabase({ dataDir: 'memory://' });
  await runMigrations(client);
  await client.query(
    "INSERT INTO collection (path, name, last_opened) VALUES ($1, 'Search', now())",
    [COLLECTION]
  );
  const insert = (path: string, content: string) =>
    client.query(
      `INSERT INTO entry (path, name, parent_path, collection_path, content)
       VALUES ($1, $2, $3, $4, $5)`,
      [path, path.split('/').pop(), COLLECTION, COLLECTION, content]
    );
  await insert('/Search/notes.md', 'First line\nHaptic is a Markdown editor\nLast line');
  await insert('/Search/other.md', "Don't panic — it's fine\nnothing else");
  await insert('/Search/word.md', 'markdownish text\nplain markdown here');
});

describe('searchEntries', () => {
  it('finds matches case-insensitively with surrounding context', async () => {
    const results = await searchEntries(COLLECTION, 'markdown');
    const paths = results.map((r) => r.path);
    expect(paths).toContain('/Search/notes.md');
    expect(paths).toContain('/Search/word.md');
    const notesHit = results.find((r) => r.path === '/Search/notes.md');
    expect(notesHit?.context_preview).toContain('Haptic is a Markdown editor');
    expect(notesHit?.context_preview).toContain('First line');
  });

  it('respects case sensitivity', async () => {
    const results = await searchEntries(COLLECTION, 'Markdown', true);
    expect(results.map((r) => r.path)).toEqual(['/Search/notes.md']);
  });

  it('handles single quotes in the query without breaking the SQL', async () => {
    const results = await searchEntries(COLLECTION, "Don't");
    expect(results.map((r) => r.path)).toEqual(['/Search/other.md']);
  });

  it('matches whole words only when requested', async () => {
    const results = await searchEntries(COLLECTION, 'markdown', false, true);
    const paths = results.map((r) => r.path);
    expect(paths).toContain('/Search/word.md');
    // 'markdownish' is not a whole-word match
    expect(paths.filter((p) => p === '/Search/word.md')).toHaveLength(1);
  });

  it('returns no results for a query that matches nothing', async () => {
    expect(await searchEntries(COLLECTION, 'zzz-not-there')).toEqual([]);
  });
});

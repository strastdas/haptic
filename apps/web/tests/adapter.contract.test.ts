import { runStorageAdapterContract } from '@haptic/core/adapter.contract';
import { beforeAll, vi } from 'vitest';

// The contract covers storage behavior only, but createNote/moveNote/
// duplicateNote open the note they touch, which drives the shared TipTap
// editor store. Stub the editor seam so the adapter runs headless.
vi.mock('@haptic/editor/store', () => ({
  editor: {
    subscribe: () => () => {},
    set: () => {},
    update: () => {},
    subscribeToSaveEvents: () => () => {},
    notifySaveEvent: () => {}
  },
  setEditorContent: () => {}
}));

import * as collectionApi from '@/api/collection';
import * as foldersApi from '@/api/folders';
import * as notesApi from '@/api/notes';
import { initDatabase } from '@/database/client';
import { runMigrations } from '@/database/migrations';
import { searchEntries } from '@/utils';

const COLLECTION_PATH = '/Contract';

beforeAll(async () => {
  const client = await initDatabase({ dataDir: 'memory://' });
  await runMigrations(client);
});

runStorageAdapterContract('web adapter (in-memory PGlite)', async () => {
  const client = await initDatabase({ dataDir: 'memory://' });
  // Fresh state per test: FK order matters (entry/settings reference collection)
  await client.exec('DELETE FROM entry; DELETE FROM collection_settings; DELETE FROM collection;');
  await collectionApi.loadCollection(COLLECTION_PATH);
  return {
    adapter: { ...notesApi, ...foldersApi, ...collectionApi, searchEntries },
    collectionPath: COLLECTION_PATH,
    writeContent: async (path: string, content: string) => {
      await client.query('UPDATE entry SET content = $2 WHERE path = $1', [path, content]);
    }
  };
});

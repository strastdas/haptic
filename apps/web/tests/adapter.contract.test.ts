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
import { searchEntries } from '@/utils';

const COLLECTION_PATH = '/Contract';

beforeAll(async () => {
  await initDatabase({ dbName: 'contract-test' });
});

runStorageAdapterContract('web adapter (IndexedDB)', async () => {
  const db = await initDatabase({ dbName: 'contract-test' });
  // Fresh state per test
  await Promise.all([db.clear('entry'), db.clear('collectionSettings'), db.clear('collection')]);
  await collectionApi.loadCollection(COLLECTION_PATH);
  return {
    adapter: { ...notesApi, ...foldersApi, ...collectionApi, searchEntries },
    collectionPath: COLLECTION_PATH
  };
});

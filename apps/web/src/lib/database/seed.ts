import { getDb, type HapticDatabase } from './client';
import seedData from './seed-data.json';

const SEED_COLLECTION = '/Haptic';

/**
 * Seeds the demo "Haptic" collection, but ONLY on a genuinely empty database.
 * A user who deletes the demo collection is never re-seeded, because the check
 * is "are there any collections at all", not "does /Haptic exist".
 */
export async function seedIfFresh(db: HapticDatabase = getDb()): Promise<boolean> {
  if ((await db.count('collection')) > 0) {
    return false;
  }

  const now = new Date();
  const tx = db.transaction(['collection', 'entry'], 'readwrite');

  await tx.objectStore('collection').put({
    path: SEED_COLLECTION,
    name: 'Haptic',
    lastOpened: now
  });

  const entries = tx.objectStore('entry');
  await Promise.all(
    seedData.map((note) =>
      entries.put({
        path: note.path,
        name: note.name,
        parentPath: SEED_COLLECTION,
        collectionPath: SEED_COLLECTION,
        content: note.content,
        isFolder: false,
        size: new TextEncoder().encode(note.content).length,
        createdAt: now,
        updatedAt: now
      })
    )
  );

  await tx.done;
  return true;
}

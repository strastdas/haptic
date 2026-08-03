import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CollectionSettingsParams } from '@/types';

/**
 * Browser-local storage for the `local` scope.
 *
 * This replaced PGlite + drizzle. PGlite was only ever backing a tree of text
 * files: its live queries were two `SELECT * FROM entry` hooks that just
 * refetched, and search was a single `ILIKE`. Neither justified shipping WASM
 * Postgres, an ORM and a migration runner — and IndexedDB works in every mobile
 * browser, which PGlite effectively did not.
 *
 * The shape stays deliberately close to the old tables so the api modules read
 * much the same. Object stores replace tables; the `by-collection` /
 * `by-parent` indexes replace `WHERE collection_path = …` / `parent_path = …`.
 */

export const DB_NAME = 'haptic-local';
const DB_VERSION = 1;

export interface EntryRow {
  path: string;
  name: string | null;
  parentPath: string;
  collectionPath: string | null;
  content: string | null;
  isFolder: boolean;
  size: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionRow {
  path: string;
  name: string;
  lastOpened: Date;
}

export interface CollectionSettingsRow {
  collectionPath: string;
  editor: CollectionSettingsParams['editor'];
  notes: CollectionSettingsParams['notes'];
}

interface HapticDB extends DBSchema {
  entry: {
    key: string;
    value: EntryRow;
    indexes: { 'by-collection': string; 'by-parent': string };
  };
  collection: { key: string; value: CollectionRow };
  collectionSettings: { key: string; value: CollectionSettingsRow };
}

export type HapticDatabase = IDBPDatabase<HapticDB>;

let dbPromise: Promise<HapticDatabase> | null = null;
let dbInstance: HapticDatabase | null = null;

/**
 * Open (or reuse) the database. Awaited once in the root layout before anything
 * that touches storage renders, so `getDb()` can stay synchronous. Tests pass a
 * unique `dbName` to get an isolated database per run.
 */
export function initDatabase(options: { dbName?: string } = {}): Promise<HapticDatabase> {
  dbPromise ??= openDB<HapticDB>(options.dbName ?? DB_NAME, DB_VERSION, {
    upgrade(db) {
      const entries = db.createObjectStore('entry', { keyPath: 'path' });
      entries.createIndex('by-collection', 'collectionPath');
      entries.createIndex('by-parent', 'parentPath');
      db.createObjectStore('collection', { keyPath: 'path' });
      db.createObjectStore('collectionSettings', { keyPath: 'collectionPath' });
    }
  }).then((db) => {
    dbInstance = db;
    return db;
  });
  return dbPromise;
}

/**
 * The open database. Only valid after `initDatabase()` resolves — throwing here
 * surfaces a bootstrap-order mistake immediately rather than handing back
 * undefined further down.
 */
export function getDb(): HapticDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Await initDatabase() during app bootstrap.');
  }
  return dbInstance;
}

/** Test seam — drops the cached handle so the next init opens a fresh database. */
export function resetDatabase() {
  dbInstance?.close();
  dbInstance = null;
  dbPromise = null;
}

// --- change notification -----------------------------------------------------
// Replaces the PGlite live queries. Both former call sites ran
// `SELECT * FROM entry` and then refetched the tree wholesale, so a bare
// "something changed" signal is exactly equivalent — and doesn't need a query
// engine to deliver it.

type EntriesListener = () => void;
const entriesListeners = new Set<EntriesListener>();

/** Subscribe to entry changes. Returns an unsubscribe function. */
export function watchEntries(listener: EntriesListener): () => void {
  entriesListeners.add(listener);
  return () => {
    entriesListeners.delete(listener);
  };
}

/** Fired by every write below. */
export function notifyEntriesChanged() {
  entriesListeners.forEach((listener) => listener());
}

// --- entry helpers -----------------------------------------------------------

export function allEntries(collectionPath: string): Promise<EntryRow[]> {
  return getDb().getAllFromIndex('entry', 'by-collection', collectionPath);
}

export function childEntries(parentPath: string): Promise<EntryRow[]> {
  return getDb().getAllFromIndex('entry', 'by-parent', parentPath);
}

export function getEntry(path: string): Promise<EntryRow | undefined> {
  return getDb().get('entry', path);
}

export async function putEntry(row: EntryRow): Promise<void> {
  await getDb().put('entry', row);
  notifyEntriesChanged();
}

export async function deleteEntry(path: string): Promise<void> {
  await getDb().delete('entry', path);
  notifyEntriesChanged();
}

/**
 * Moves a row to a new key. IndexedDB keys are immutable, so a rename or move
 * is delete-then-put rather than an UPDATE of the primary key.
 */
export async function repathEntry(from: string, row: EntryRow): Promise<void> {
  const tx = getDb().transaction('entry', 'readwrite');
  await tx.store.delete(from);
  await tx.store.put(row);
  await tx.done;
  notifyEntriesChanged();
}

/** Atomically moves a folder row and every descendant to their new paths. */
export async function repathEntries(entries: { from: string; row: EntryRow }[]): Promise<void> {
  const tx = getDb().transaction('entry', 'readwrite');
  await Promise.all(entries.map(({ from }) => tx.store.delete(from)));
  await Promise.all(entries.map(({ row }) => tx.store.put(row)));
  await tx.done;
  notifyEntriesChanged();
}

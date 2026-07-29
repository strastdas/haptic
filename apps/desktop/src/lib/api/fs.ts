import type { FileEntry } from '@/types';
import { readDir } from '@tauri-apps/plugin-fs';

/**
 * Tauri 2's `readDir` is flat (no `recursive` option) and its `DirEntry` has
 * no `path`/`children` fields. This walk rebuilds the v1-style `FileEntry`
 * tree that @haptic/core expects: directories always carry a `children` array
 * (empty when not walking recursively), files leave it undefined — callers
 * rely on `entry.children === undefined` to detect files.
 */
export async function readDirTree(dirPath: string, recursive = true): Promise<FileEntry[]> {
  const entries = await readDir(dirPath);

  return Promise.all(
    entries.map(async (entry): Promise<FileEntry> => {
      const path = `${dirPath}/${entry.name}`;

      if (!entry.isDirectory) {
        return { path, name: entry.name };
      }

      return {
        path,
        name: entry.name,
        children: recursive ? await readDirTree(path, true) : []
      };
    })
  );
}

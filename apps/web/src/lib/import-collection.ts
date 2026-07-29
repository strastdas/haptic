import { loadCollection } from '@haptic/core/adapter';
import { db } from '@/database/client';
import { entry as entryTable } from '@/database/schema';

/**
 * Web-only collection import: ingests a folder picked via the hidden
 * `<input webkitdirectory>` in the shared command menu into PGlite.
 * Passed to @haptic/app's command menu as its `importCollection` prop.
 */
export async function importCollection(
  files: FileList,
  onProgress: (progress: number) => void
): Promise<void> {
  const first = files[0];
  if (!first) {
    return;
  }

  // Load collection
  const collectionName = first.webkitRelativePath.split('/')[0];
  await loadCollection(`/${collectionName}`);

  const processedPaths = new Set<string>();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) {
      continue;
    }

    const filePath = `/${file.webkitRelativePath}`;
    const pathParts = file.webkitRelativePath.split('/');
    const fileName = pathParts.at(-1);

    // Report progress
    onProgress(Math.round(((i + 1) / files.length) * 100));

    // Create folder entries
    let currentPath = '';
    for (let j = 0; j < pathParts.length - 1; j++) {
      currentPath += `/${pathParts[j]}`;
      if (!processedPaths.has(currentPath)) {
        await createFolderEntry(currentPath, collectionName);
        processedPaths.add(currentPath);
      }
    }

    // Process file
    if (file.name.toLowerCase().endsWith('.md')) {
      try {
        const fileText = await file.text();
        await db.insert(entryTable).values({
          name: fileName,
          path: filePath,
          content: fileText,
          parentPath: currentPath,
          collectionPath: `/${collectionName}`,
          size: file.size,
          isFolder: false
        });
        console.log('Inserted file:', fileName);
      } catch (error) {
        console.error('Error processing file:', fileName, error);
      }
    } else {
      console.warn('Skipping non-Markdown file:', fileName);
    }
  }
}

async function createFolderEntry(path: string, collectionName: string) {
  const pathParts = path.split('/').filter(Boolean);
  const folderName = pathParts.at(-1);
  const parentPath = `/${pathParts.slice(0, -1).join('/')}`;

  try {
    await db.insert(entryTable).values({
      name: folderName,
      path,
      content: undefined,
      parentPath,
      collectionPath: `/${collectionName}`,
      isFolder: true
    });
    console.log('Created folder entry:', path);
  } catch (error) {
    console.error('Error creating folder entry:', path, error);
  }
}

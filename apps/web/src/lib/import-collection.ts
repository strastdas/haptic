import { loadCollection } from '@haptic/core/adapter';
import { putEntry } from '@/database/client';

/**
 * Web-only collection import: ingests a folder picked via the hidden
 * `<input webkitdirectory>` in the shared command menu into the browser store.
 * Passed to @haptic/app's command menu as its `importCollection` prop.
 *
 * `webkitRelativePath` is always '/'-separated per spec, so it needs no
 * separator normalization even on Windows.
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
        const now = new Date();
        await putEntry({
          name: fileName ?? null,
          path: filePath,
          content: fileText,
          parentPath: currentPath,
          collectionPath: `/${collectionName}`,
          size: file.size,
          isFolder: false,
          createdAt: now,
          updatedAt: now
        });
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
    const now = new Date();
    await putEntry({
      name: folderName ?? null,
      path,
      content: null,
      parentPath,
      collectionPath: `/${collectionName}`,
      size: null,
      isFolder: true,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    console.error('Error creating folder entry:', path, error);
  }
}

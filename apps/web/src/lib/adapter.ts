import { setStorageAdapter } from '@haptic/core/adapter';
import * as collection from './api/collection';
import * as folders from './api/folders';
import * as notes from './api/notes';
import * as settings from './api/settings';

/**
 * Registers the web (PGlite/drizzle) implementations behind @haptic/core's
 * StorageAdapter seam. Imported for its side effect from the root layout.
 */
setStorageAdapter({
  ...notes,
  ...collection,
  ...folders,
  ...settings
});

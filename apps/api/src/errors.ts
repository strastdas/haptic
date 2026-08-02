export class ReplayedHandoffError extends Error {
  override name = 'ReplayedHandoffError';
}

/** A note path is already occupied in the requested cloud collection. */
export class DuplicateNotePathError extends Error {
  override name = 'DuplicateNotePathError';
}

/** A folder cannot be deleted until its visible children are removed. */
export class FolderNotEmptyError extends Error {
  override name = 'FolderNotEmptyError';
}

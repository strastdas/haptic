export class ReplayedHandoffError extends Error {
  override name = 'ReplayedHandoffError';
}

/** A note path is already occupied in the requested cloud collection. */
export class DuplicateNotePathError extends Error {
  override name = 'DuplicateNotePathError';
}

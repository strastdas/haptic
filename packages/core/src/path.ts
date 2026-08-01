/**
 * Scoped paths.
 *
 * A path identifies both *where* a note lives and *which storage* owns it. The
 * scope is carried as a scheme prefix on the ordinary path string —
 * `cloud:/col_123/note.md` — rather than as a separate field, because paths are
 * threaded through stores (`activeFile`, `draftFile`, `noteHistory`,
 * `collection`), through the StorageAdapter interface, *and* through DOM
 * attributes: `notes/entries.svelte` and `daily/sidebar.svelte` both do
 * `querySelector('[data-path="…"]')` lookups. A structured `{scope, path}`
 * object would break all of that.
 *
 * `local` is the **implicit default**: an unprefixed path means local. Only
 * non-default scopes are ever emitted with a prefix. That keeps every path
 * already persisted in `collections.json` and the web `collection` table valid
 * with no migration, and means existing call sites are byte-for-byte unaffected
 * until something deliberately opts into another scope.
 *
 * Adapters receive and emit *fully scoped* paths. The local adapter therefore
 * needs no changes at all (it only ever sees default-scope paths); the cloud
 * adapter is written scope-aware from the start.
 *
 * Separators are always forward slashes internally, including on Windows —
 * Rust's `std::path` accepts `/` there. Normalization happens once, at the
 * boundary where a native path enters the app (see `normalizeSeparators`), not
 * on every parse, because a backslash is a legal filename character on POSIX.
 */

export type StorageScope = 'local' | 'cloud';

/** Scope assumed for unprefixed paths, and the only scope never written out. */
export const DEFAULT_SCOPE: StorageScope = 'local';

const SCOPE_PATTERN = /^(?<scope>local|cloud):/;

export interface ScopedPath {
  scope: StorageScope;
  /** The path with its scope prefix removed. */
  path: string;
}

/**
 * Splits a path into its scope and remainder.
 *
 * Only the known scheme names are recognised, which is what makes this safe on
 * Windows: `C:/Users/me/notes` has a colon but `C` is not a scope, so it parses
 * as an unprefixed (local) path.
 */
export function parseScopedPath(input: string): ScopedPath {
  const match = SCOPE_PATTERN.exec(input);
  if (match?.groups) {
    return { scope: match.groups.scope as StorageScope, path: input.slice(match[0].length) };
  }
  return { scope: DEFAULT_SCOPE, path: input };
}

/** The scope a path belongs to. */
export function scopeOf(input: string): StorageScope {
  return parseScopedPath(input).scope;
}

/** The path without its scope prefix — what a scope-blind consumer wants. */
export function stripScope(input: string): string {
  return parseScopedPath(input).path;
}

/** Re-attaches a scope, omitting the prefix for the default scope. */
export function withScope(scope: StorageScope, path: string): string {
  return scope === DEFAULT_SCOPE ? path : `${scope}:${path}`;
}

/** True when both paths are owned by the same storage. */
export function sameScope(a: string, b: string): boolean {
  return scopeOf(a) === scopeOf(b);
}

/**
 * Converts native separators to forward slashes.
 *
 * Call this once, where a path crosses into the app from the OS (the Tauri
 * directory dialog), so everything downstream can assume `/`. Deliberately not
 * applied inside `parseScopedPath`: on POSIX a backslash is a valid filename
 * character and normalizing every parse would corrupt such paths.
 */
export function normalizeSeparators(path: string): string {
  return path.replaceAll('\\', '/');
}

/** Final segment of a path (`/a/b/note.md` -> `note.md`). Scope is dropped. */
export function basename(input: string): string {
  const { path } = parseScopedPath(input);
  const index = path.lastIndexOf('/');
  return index === -1 ? path : path.slice(index + 1);
}

/** Filename without its extension (`note.test.md` -> `note.test`). */
export function stem(input: string): string {
  const name = basename(input);
  const index = name.lastIndexOf('.');
  return index <= 0 ? name : name.slice(0, index);
}

/** Extension without the dot (`note.md` -> `md`), or '' when there is none. */
export function extname(input: string): string {
  const name = basename(input);
  const index = name.lastIndexOf('.');
  return index <= 0 ? '' : name.slice(index + 1);
}

/**
 * Parent directory, keeping the scope (`cloud:/a/b.md` -> `cloud:/a`).
 *
 * A note directly under the root yields `/`, not `''` — otherwise joining the
 * result back together would silently drop the leading separator and produce a
 * relative path.
 */
export function dirname(input: string): string {
  const { scope, path } = parseScopedPath(input);
  const index = path.lastIndexOf('/');
  if (index === -1) {
    return withScope(scope, '');
  }
  return withScope(scope, index === 0 ? '/' : path.slice(0, index));
}

/**
 * Joins segments onto a base path, keeping the base's scope and collapsing
 * duplicate separators. A leading `//` survives only when the *base* is a UNC
 * path, so joining onto the root `/` doesn't accidentally create one.
 */
export function joinPath(base: string, ...segments: string[]): string {
  const { scope, path } = parseScopedPath(base);
  const joined = [path, ...segments].filter((segment) => segment.length > 0).join('/');
  const collapsed = joined.replaceAll(/\/{2,}/g, '/');
  return withScope(scope, path.startsWith('//') ? `/${collapsed}` : collapsed);
}

/** Replaces the final segment, keeping directory and scope (used by rename). */
export function withBasename(input: string, name: string): string {
  return joinPath(dirname(input), name);
}

/** Number of non-empty segments in a path, ignoring scope. */
export function depth(input: string): number {
  return parseScopedPath(input).path.split('/').filter(Boolean).length;
}

/**
 * How many levels `path` sits below `base`. Used for tree indentation, which
 * previously counted `/` characters directly and so mis-rendered any path that
 * still carried native separators.
 */
export function relativeDepth(path: string, base: string): number {
  return Math.max(0, depth(path) - depth(base));
}

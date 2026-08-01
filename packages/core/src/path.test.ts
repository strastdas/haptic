import { describe, expect, it } from 'vitest';
import {
  basename,
  depth,
  dirname,
  extname,
  joinPath,
  normalizeSeparators,
  parseScopedPath,
  relativeDepth,
  sameScope,
  scopeOf,
  stem,
  stripScope,
  withBasename,
  withScope
} from './path';

describe('scope parsing', () => {
  it('treats an unprefixed path as local', () => {
    expect(parseScopedPath('/Notes/a.md')).toEqual({ scope: 'local', path: '/Notes/a.md' });
    expect(scopeOf('/Notes/a.md')).toBe('local');
  });

  it('parses a known scheme prefix', () => {
    expect(parseScopedPath('cloud:/col_1/a.md')).toEqual({ scope: 'cloud', path: '/col_1/a.md' });
    expect(stripScope('cloud:/col_1/a.md')).toBe('/col_1/a.md');
  });

  // The reason only known scheme names are recognised rather than "text before
  // the first colon": Windows drive letters would otherwise parse as a scope.
  it('does not mistake a Windows drive letter for a scope', () => {
    expect(parseScopedPath('C:/Users/me/notes')).toEqual({
      scope: 'local',
      path: 'C:/Users/me/notes'
    });
    expect(basename('C:/Users/me/notes/a.md')).toBe('a.md');
  });

  it('omits the prefix for the default scope so persisted paths stay valid', () => {
    expect(withScope('local', '/Notes/a.md')).toBe('/Notes/a.md');
    expect(withScope('cloud', '/col_1/a.md')).toBe('cloud:/col_1/a.md');
  });

  it('normalizes an explicit local: prefix away on round-trip', () => {
    expect(dirname('local:/Notes/a.md')).toBe('/Notes');
  });

  it('compares scopes', () => {
    expect(sameScope('/a.md', '/b.md')).toBe(true);
    expect(sameScope('/a.md', 'cloud:/b.md')).toBe(false);
    expect(sameScope('cloud:/a.md', 'cloud:/b.md')).toBe(true);
  });
});

describe('separator normalization', () => {
  it('converts Windows separators', () => {
    expect(normalizeSeparators(String.raw`C:\Users\me\notes`)).toBe('C:/Users/me/notes');
  });
});

describe('path components', () => {
  it('extracts basename, stem and extension', () => {
    expect(basename('/a/b/note.md')).toBe('note.md');
    expect(stem('/a/b/note.md')).toBe('note');
    expect(stem('/a/b/note.test.md')).toBe('note.test');
    expect(extname('/a/b/note.md')).toBe('md');
    expect(extname('/a/b/README')).toBe('');
  });

  it('treats a leading dot as part of the name, not an extension', () => {
    expect(stem('/a/.haptic')).toBe('.haptic');
    expect(extname('/a/.haptic')).toBe('');
  });

  it('drops the scope from basename but keeps it on dirname', () => {
    expect(basename('cloud:/col_1/a.md')).toBe('a.md');
    expect(dirname('cloud:/col_1/sub/a.md')).toBe('cloud:/col_1/sub');
  });

  // Regression: dirname returning '' here made joinPath produce a relative path.
  it('returns the root for a note directly under it', () => {
    expect(dirname('/note.md')).toBe('/');
    expect(joinPath(dirname('/note.md'), 'other.md')).toBe('/other.md');
    expect(dirname('cloud:/note.md')).toBe('cloud:/');
    expect(joinPath(dirname('cloud:/note.md'), 'other.md')).toBe('cloud:/other.md');
  });
});

describe('joinPath', () => {
  it('joins and keeps the scope', () => {
    expect(joinPath('/a/b', 'c.md')).toBe('/a/b/c.md');
    expect(joinPath('cloud:/col_1', 'sub', 'c.md')).toBe('cloud:/col_1/sub/c.md');
  });

  it('collapses duplicate separators', () => {
    expect(joinPath('/a/b/', '/c.md')).toBe('/a/b/c.md');
    expect(joinPath('/a/', '', 'c.md')).toBe('/a/c.md');
  });

  it('preserves a UNC base but never invents one', () => {
    expect(joinPath('//server/share', 'a.md')).toBe('//server/share/a.md');
    expect(joinPath('/', 'a.md')).toBe('/a.md');
  });

  it('replaces the final segment', () => {
    expect(withBasename('/a/b/old.md', 'new.md')).toBe('/a/b/new.md');
    expect(withBasename('cloud:/col_1/old.md', 'new.md')).toBe('cloud:/col_1/new.md');
  });
});

describe('depth', () => {
  it('counts segments, ignoring scope and leading separators', () => {
    expect(depth('/a/b/c.md')).toBe(3);
    expect(depth('cloud:/a/b/c.md')).toBe(3);
  });

  it('measures nesting relative to a collection root', () => {
    expect(relativeDepth('/Notes/a.md', '/Notes')).toBe(1);
    expect(relativeDepth('/Notes/sub/a.md', '/Notes')).toBe(2);
    expect(relativeDepth('/Notes', '/Notes')).toBe(0);
  });

  // The old implementation counted '/' characters, so a Windows-shaped
  // collection root had one segment and every child rendered at the wrong indent.
  it('is unaffected by a drive-letter root', () => {
    expect(relativeDepth('C:/Users/me/Notes/a.md', 'C:/Users/me/Notes')).toBe(1);
    expect(relativeDepth('C:/Users/me/Notes/sub/a.md', 'C:/Users/me/Notes')).toBe(2);
  });

  it('never goes negative', () => {
    expect(relativeDepth('/a', '/a/b/c')).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { platform } from './store';
import type { FileEntry } from './types';
import {
  escapeRegExp,
  formatFileSize,
  formatTimeAgo,
  getNextUntitledName,
  hideDotFiles,
  shortcutToString,
  sortFileEntry
} from './utils';

describe('escapeRegExp', () => {
  it('escapes all regex metacharacters', () => {
    expect(escapeRegExp('.*+?^${}()|[]\\')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });

  it.each(['(', '[', '\\', 'a(b', '[unclosed', 'trailing\\'])(
    'produces a valid RegExp for editor-search crash input %j',
    (input) => {
      expect(() => new RegExp(escapeRegExp(input))).not.toThrow();
      expect(new RegExp(escapeRegExp(input)).test(input)).toBe(true);
    }
  );

  it('leaves plain text untouched', () => {
    expect(escapeRegExp('hello world')).toBe('hello world');
  });

  it('escaped pattern matches literally, not as a wildcard', () => {
    const regex = new RegExp(escapeRegExp('a.c'));
    expect(regex.test('a.c')).toBe(true);
    expect(regex.test('abc')).toBe(false);
  });
});

describe('getNextUntitledName', () => {
  it('returns the bare prefix when no files exist', () => {
    expect(getNextUntitledName([], 'Untitled', '.md')).toBe('Untitled.md');
    expect(getNextUntitledName([], 'Untitled')).toBe('Untitled');
  });

  it('increments past the highest existing number', () => {
    const files = [{ name: 'Untitled.md' }, { name: 'Untitled 1.md' }];
    expect(getNextUntitledName(files, 'Untitled', '.md')).toBe('Untitled 2.md');
  });

  it('fills gaps in the numbering', () => {
    const files = [{ name: 'Untitled.md' }, { name: 'Untitled 2.md' }];
    expect(getNextUntitledName(files, 'Untitled', '.md')).toBe('Untitled 1.md');
  });

  it('ignores files with other extensions and folders without the extension', () => {
    const files = [{ name: 'Untitled.txt' }, { name: 'Untitled' }];
    expect(getNextUntitledName(files, 'Untitled', '.md')).toBe('Untitled.md');
  });

  it('scans numbering case-insensitively but the exact-name check is case-sensitive', () => {
    // 'untitled 1.md' bumps the counter, yet 'Untitled.md' itself is free
    // because the final availability check compares exact names.
    const files = [{ name: 'untitled 1.md' }];
    expect(getNextUntitledName(files, 'Untitled', '.md')).toBe('Untitled.md');
  });
});

describe('formatFileSize', () => {
  it('formats zero and small byte counts', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(512)).toBe('512 Bytes');
  });

  it('formats KB and MB (ceiled, no decimals)', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('2 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
  });

  it('formats GB', () => {
    expect(formatFileSize(1024 ** 3)).toBe('1 GB');
  });
});

describe('formatTimeAgo', () => {
  it('returns an empty string for undefined', () => {
    expect(formatTimeAgo(undefined)).toBe('');
  });

  it('formats seconds, minutes, hours and days with pluralization', () => {
    const now = Date.now();
    expect(formatTimeAgo(new Date(now - 10 * 1000))).toBe('10 seconds ago');
    expect(formatTimeAgo(new Date(now - 60 * 1000))).toBe('1 minute ago');
    expect(formatTimeAgo(new Date(now - 2 * 60 * 60 * 1000))).toBe('2 hours ago');
    expect(formatTimeAgo(new Date(now - 3 * 24 * 60 * 60 * 1000))).toBe('3 days ago');
  });
});

describe('sortFileEntry', () => {
  const folder = (name: string): FileEntry => ({ path: `/${name}`, name, children: [] });
  const file = (name: string): FileEntry => ({ path: `/${name}`, name });

  it('sorts folders before files', () => {
    expect(sortFileEntry(folder('zzz'), file('aaa'))).toBeLessThan(0);
    expect(sortFileEntry(file('aaa'), folder('zzz'))).toBeGreaterThan(0);
  });

  it('sorts names naturally (numeric-aware, case-insensitive)', () => {
    expect(sortFileEntry(file('2.md'), file('10.md'))).toBeLessThan(0);
    expect(sortFileEntry(file('Beta.md'), file('alpha.md'))).toBeGreaterThan(0);
    const entries = [file('note 10.md'), file('note 2.md'), file('Note 1.md')];
    entries.sort(sortFileEntry);
    expect(entries.map((e) => e.name)).toEqual(['Note 1.md', 'note 2.md', 'note 10.md']);
  });
});

describe('hideDotFiles', () => {
  it('removes dotfiles recursively while keeping visible entries', () => {
    const entries = [
      { name: '.DS_Store' },
      { name: 'visible.md' },
      {
        name: 'folder',
        children: [{ name: '.hidden.md' }, { name: 'nested.md' }]
      }
    ];
    const result = hideDotFiles(entries);
    expect(result.map((e) => e.name)).toEqual(['visible.md', 'folder']);
    expect(result[1].children?.map((e) => e.name)).toEqual(['nested.md']);
  });
});

describe('shortcutToString', () => {
  it('renders mac-style modifiers on darwin', () => {
    platform.set('darwin');
    expect(shortcutToString({ key: 'k', command: true })).toBe('⌘K');
    expect(shortcutToString({ key: 'Enter', command: true, shift: true, alt: true })).toBe('⌘⌥⇧⏎');
  });

  it('renders ctrl-style command modifier on linux', () => {
    platform.set('linux');
    try {
      expect(shortcutToString({ key: 'k', command: true })).toBe('⌃K');
    } finally {
      platform.set('darwin');
    }
  });

  it('maps special keys to glyphs', () => {
    platform.set('darwin');
    expect(shortcutToString({ key: 'Backspace' })).toBe('⌫');
    expect(shortcutToString({ key: 'Escape' })).toBe('⎋');
    expect(shortcutToString({ key: 'ArrowUp' })).toBe('↑');
  });
});

import { describe, expect, it } from 'vitest';
import { NAV_GROUPS, NAV_REGISTRY, applyNavOrder, navLabel } from './navigationItems';

describe('navLabel', () => {
  it('falls back to the built-in name', () => {
    expect(navLabel('/tasks', 'Action Items', undefined)).toBe('Action Items');
    expect(navLabel('/tasks', 'Action Items', {})).toBe('Action Items');
  });

  it('uses a custom name when one is set', () => {
    expect(navLabel('/tasks', 'Action Items', { '/tasks': 'To Do' })).toBe('To Do');
  });

  it('ignores a blank custom name rather than showing nothing', () => {
    expect(navLabel('/tasks', 'Action Items', { '/tasks': '   ' })).toBe('Action Items');
    expect(navLabel('/tasks', 'Action Items', { '/tasks': '' })).toBe('Action Items');
  });

  it('renames only the entry it names', () => {
    const labels = { '/tasks': 'To Do' };
    expect(navLabel('/offers', 'Offers', labels)).toBe('Offers');
  });

  it('trims a custom name', () => {
    expect(navLabel('/offers', 'Offers', { '/offers': '  Comp  ' })).toBe('Comp');
  });
});

describe('applyNavOrder', () => {
  it('leaves items alone when nothing is saved', () => {
    const items = [{ key: 'a' }, { key: 'b' }];
    expect(applyNavOrder(items, [])).toEqual(items);
    expect(applyNavOrder(items, undefined)).toEqual(items);
  });

  it('sorts by the saved order', () => {
    const items = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
    expect(applyNavOrder(items, ['c', 'a', 'b']).map((i) => i.key)).toEqual(['c', 'a', 'b']);
  });

  it('keeps an entry the saved order has never seen', () => {
    const items = [{ key: 'a' }, { key: 'new' }, { key: 'b' }];
    expect(applyNavOrder(items, ['b', 'a']).map((i) => i.key)).toEqual(['b', 'a', 'new']);
  });
});

describe('NAV_GROUPS', () => {
  it('has a unique key for every entry, so a rename cannot hit two of them', () => {
    const keys: string[] = [];
    for (const group of NAV_GROUPS) {
      keys.push(group.key);
      for (const item of group.items) {
        keys.push(item.key);
        for (const child of item.children ?? []) keys.push(child.key);
      }
    }
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('a tab added after the order was saved', () => {
  const items = [{ key: 'a' }, { key: 'new' }, { key: 'b' }, { key: 'c' }];

  it('lands in its built-in position, not at the end', () => {
    // The saved order predates 'new', so it only names the three that existed.
    expect(applyNavOrder(items, ['a', 'b', 'c']).map((i) => i.key)).toEqual(['a', 'new', 'b', 'c']);
  });

  it('follows its built-in predecessor even when the saved order moved things about', () => {
    expect(applyNavOrder(items, ['c', 'b', 'a']).map((i) => i.key)).toEqual(['c', 'b', 'a', 'new']);
  });

  it('goes first when it has no predecessor left', () => {
    const leading = [{ key: 'new' }, { key: 'a' }, { key: 'b' }];
    expect(applyNavOrder(leading, ['a', 'b']).map((i) => i.key)).toEqual(['new', 'a', 'b']);
  });

  it('keeps two new tabs in their built-in sequence', () => {
    const two = [{ key: 'a' }, { key: 'n1' }, { key: 'n2' }, { key: 'b' }];
    expect(applyNavOrder(two, ['a', 'b']).map((i) => i.key)).toEqual(['a', 'n1', 'n2', 'b']);
  });

  it('still honours a saved order that names everything', () => {
    expect(applyNavOrder(items, ['c', 'new', 'b', 'a']).map((i) => i.key)).toEqual([
      'c',
      'new',
      'b',
      'a',
    ]);
  });
});

describe('Today entry', () => {
  it('is offered as its own route, not as /', () => {
    const keys = NAV_REGISTRY.map((entry) => entry.key);
    expect(keys).toContain('/command-center');
    expect(keys).toContain('/availability');
    // '/' only redirects now; a nav entry on it would inherit any saved hidden state.
    expect(keys).not.toContain('/');
  });

  it('survives a saved preference that hid the old landing route', () => {
    const hidden = ['/'];
    const visible = NAV_REGISTRY.filter((entry) => !hidden.includes(entry.key)).map((e) => e.key);
    expect(visible).toContain('/command-center');
  });

  it('keeps its place when a saved order predates it', () => {
    const items = NAV_REGISTRY.map((entry) => ({ key: entry.key }));
    const savedOrderWithoutToday = ['/events', '/applications', '/tasks'];
    const ordered = applyNavOrder(items, savedOrderWithoutToday).map((item) => item.key);
    expect(ordered).toContain('/command-center');
  });
});

describe('every nav entry is told apart by its icon', () => {
  // Two adjacent entries shared one glyph and the sidebar read as a repeated item.
  it('gives no two entries in a group the same icon', () => {
    const byGroup = new Map<string, string[]>();
    for (const entry of NAV_REGISTRY) {
      const name = entry.icon?.displayName ?? entry.icon?.name ?? entry.key;
      byGroup.set(entry.group, [...(byGroup.get(entry.group) ?? []), name]);
    }
    for (const [group, icons] of byGroup) {
      // The AI tools deliberately share one mark; they are one family under a parent.
      const shareable = icons.filter((icon) => icon !== 'RobotOutlined');
      expect(new Set(shareable).size, `duplicate icon in ${group}`).toBe(shareable.length);
    }
  });

  it('gives every entry an icon at all', () => {
    expect(NAV_REGISTRY.filter((entry) => !entry.icon)).toEqual([]);
  });
});

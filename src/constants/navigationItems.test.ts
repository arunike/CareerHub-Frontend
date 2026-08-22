import { describe, expect, it } from 'vitest';
import { NAV_GROUPS, applyNavOrder, navLabel } from './navigationItems';

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

import { describe, expect, it } from 'vitest';
import { MOBILE_NAVIGATION_ITEMS } from './mobileNavigation';
import { NAV_GROUPS, NAV_REGISTRY } from './navigationItems';

const navigableKeys = () => {
  const keys: string[] = [];
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.children?.length) keys.push(...item.children.map((child) => child.key));
      else keys.push(item.key);
    }
  }
  return keys;
};

describe('every navigable tab can reach the mobile toolbar', () => {
  const mobileKeys = new Set<string>(MOBILE_NAVIGATION_ITEMS.map((item) => item.key));

  // A tab missing from this list has no icon or short label, so its pin silently does nothing.
  it('has a mobile entry for every tab in the sidebar', () => {
    expect(navigableKeys().filter((key) => !mobileKeys.has(key))).toEqual([]);
  });

  it('includes Income, which was missing and could not be pinned', () => {
    expect(mobileKeys.has('/income')).toBe(true);
  });

  it('keeps short labels short enough for a six-column bar', () => {
    for (const item of MOBILE_NAVIGATION_ITEMS) {
      expect(item.shortLabel.length).toBeLessThanOrEqual(7);
    }
  });

  it('gives every entry its own key', () => {
    const keys = MOBILE_NAVIGATION_ITEMS.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('the registry is the only place a tab is declared', () => {
  it('derives the mobile toolbar from it rather than restating it', () => {
    expect(MOBILE_NAVIGATION_ITEMS).toBe(NAV_REGISTRY);
  });

  it('derives the sidebar tree from it, including the nested group', () => {
    const flat: string[] = [];
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (item.children?.length) flat.push(...item.children.map((child) => child.key));
        else flat.push(item.key);
      }
    }
    expect(flat).toEqual(NAV_REGISTRY.map((entry) => entry.key));
  });

  it('nests every intelligence entry under one parent', () => {
    const career = NAV_GROUPS.find((group) => group.key === 'grp-2')!;
    const parents = career.items.filter((item) => item.children?.length);
    expect(parents).toHaveLength(1);
    expect(parents[0].key).toBe('intelligence');
    expect(parents[0].children).toHaveLength(4);
  });

  it('routes every tab the registry declares', () => {
    // Vite's raw glob, because the app tsconfig carries no Node types.
    const sources = import.meta.glob('../App.tsx', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const app = Object.values(sources).join('\n');
    const paths = [...new Set(NAV_REGISTRY.map((entry) => entry.key.split('?')[0]))];
    expect(paths.filter((path) => !app.includes(`path="${path}"`))).toEqual([]);
  });
});

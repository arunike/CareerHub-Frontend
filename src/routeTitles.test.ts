import { describe, expect, it } from 'vitest';
import { getRouteTitle } from './App';
import { NAV_REGISTRY } from './constants/navigationItems';

describe('document title', () => {
  it('names every sidebar tab, so none of them reads as missing', () => {
    const unnamed = NAV_REGISTRY.filter((entry) => !entry.key.includes('?'))
      .map((entry) => [entry.key, getRouteTitle(entry.key, true)] as const)
      .filter(([, title]) => title.startsWith('Page not found'));
    expect(unnamed).toEqual([]);
  });

  it('titles the two tabs that moved', () => {
    expect(getRouteTitle('/command-center', true)).toBe('Command Center | CareerHub');
    expect(getRouteTitle('/availability', true)).toBe('Availability | CareerHub');
  });

  it('keeps the root titled for each audience', () => {
    expect(getRouteTitle('/', true)).toBe('Command Center | CareerHub');
    expect(getRouteTitle('/', false)).toBe('CareerHub');
  });

  it('still names the routes that are not sidebar tabs', () => {
    expect(getRouteTitle('/settings', true)).toBe('Settings | CareerHub');
    expect(getRouteTitle('/profile', true)).toBe('Profile | CareerHub');
    expect(getRouteTitle('/jd-report/12', true)).toBe('Job match report | CareerHub');
  });

  it('still falls back for a route that does not exist', () => {
    expect(getRouteTitle('/nope', true)).toBe('Page not found | CareerHub');
  });
});

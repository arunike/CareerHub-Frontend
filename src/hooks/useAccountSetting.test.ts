import { describe, expect, it } from 'vitest';
import { isEmptySetting } from './useAccountSetting';

// Getting this wrong either loses a saved layout or writes on every page load.
describe('isEmptySetting', () => {
  it('treats absent values as empty', () => {
    expect(isEmptySetting(null)).toBe(true);
    expect(isEmptySetting(undefined)).toBe(true);
  });

  it('treats empty containers as empty', () => {
    expect(isEmptySetting([])).toBe(true);
    expect(isEmptySetting({})).toBe(true);
  });

  it('treats a container of empty containers as empty', () => {
    // The contact graph's shape before anything is dragged.
    expect(isEmptySetting({ nodes: {}, labels: {} })).toBe(true);
    expect(isEmptySetting({ jobHunt: [], availability: [] })).toBe(true);
  });

  it('sees a value nested at any depth', () => {
    expect(isEmptySetting({ nodes: { 'me:0': { x: 11, y: 22 } }, labels: {} })).toBe(false);
    expect(isEmptySetting({ jobHunt: ['funnel'], availability: [] })).toBe(false);
    expect(isEmptySetting([{ id: 'custom-1' }])).toBe(false);
  });

  it('counts zero and false as real values, not absence', () => {
    expect(isEmptySetting({ labels: { '0:4': 0 } })).toBe(false);
    expect(isEmptySetting({ enabled: false })).toBe(false);
    expect(isEmptySetting(0)).toBe(false);
  });
});

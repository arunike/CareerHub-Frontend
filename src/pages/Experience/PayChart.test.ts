import { describe, expect, it } from 'vitest';
import { shade, shadesFor } from './PayChart';

describe('shade', () => {
  it('returns the colour untouched at zero', () => {
    expect(shade('#2563eb', 0)).toBe('#2563eb');
  });

  it('moves toward white as the amount rises', () => {
    expect(shade('#2563eb', 1)).toBe('#ffffff');
    expect(shade('#000000', 0.5)).toBe('#808080');
  });

  it('always produces a six-digit hex', () => {
    for (const amount of [0, 0.1, 0.33, 0.9]) {
      expect(shade('#10b981', amount)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('shadesFor', () => {
  it('keeps a single child on the exact part colour', () => {
    expect(shadesFor('#2563eb', 1)).toEqual(['#2563eb']);
  });

  it('starts at the part colour and lightens across the rest', () => {
    const shades = shadesFor('#2563eb', 3);
    expect(shades[0]).toBe('#2563eb');
    expect(new Set(shades).size).toBe(3);
  });

  it('gives every child a distinct shade so neighbours stay apart', () => {
    const shades = shadesFor('#10b981', 6);
    expect(new Set(shades).size).toBe(6);
  });

  it('handles no children at all', () => {
    expect(shadesFor('#2563eb', 0)).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { bonusPercentOf, defaultBonusMode, rescaleBonus } from './bonusPercent';

describe('defaultBonusMode', () => {
  it('opens on percent when a percentage can be derived', () => {
    expect(defaultBonusMode(165000, 24750)).toBe('%');
  });

  it('opens on dollars when there is no base to take a share of', () => {
    expect(defaultBonusMode(0, 24750)).toBe('$');
    expect(defaultBonusMode(null, 24750)).toBe('$');
  });

  it('opens on dollars when there is no bonus yet', () => {
    expect(defaultBonusMode(165000, 0)).toBe('$');
    expect(defaultBonusMode(165000, null)).toBe('$');
  });
});

describe('bonusPercentOf', () => {
  it('reads the bonus back as a share of base', () => {
    expect(bonusPercentOf(165000, 24750)).toBe(15);
  });

  it('is zero rather than infinite when base is missing', () => {
    expect(bonusPercentOf(0, 24750)).toBe(0);
    expect(bonusPercentOf(null, 24750)).toBe(0);
  });
});

describe('rescaleBonus', () => {
  it('moves the bonus with the base at the percentage held', () => {
    expect(rescaleBonus('15', 181500, 24750)).toBe(27225);
  });

  it('holds the stored bonus when the percentage is unknown', () => {
    // Defaulting an unknown percent to 0 silently wiped a recorded bonus.
    expect(rescaleBonus('', 181500, 24750)).toBe(24750);
  });

  it('holds the stored bonus when the base is cleared', () => {
    expect(rescaleBonus('15', null, 24750)).toBe(24750);
  });

  it('holds the stored bonus rather than trusting unparseable text', () => {
    expect(rescaleBonus('abc', 181500, 24750)).toBe(24750);
  });

  it('honours a deliberate zero percent', () => {
    expect(rescaleBonus('0', 181500, 24750)).toBe(0);
  });
});

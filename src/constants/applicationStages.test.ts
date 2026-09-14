import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APPLICATION_STAGES,
  FILTER_ONLY_APPLICATION_STATUSES,
  findApplicationStatus,
} from './applicationStages';
import { getPaletteColorFromTone, getReadableTextColor } from '../utils/colorPalette';

const ALL = [...DEFAULT_APPLICATION_STAGES, ...FILTER_ONLY_APPLICATION_STATUSES];

describe('application stage tones', () => {
  it('gives every stage a tone, which is what any badge colours itself from', () => {
    expect(ALL.every((stage) => /^#[0-9A-Fa-f]{6}$/.test(stage.tone))).toBe(true);
  });

  it('keeps the interview rounds visually distinct from each other', () => {
    const rounds = DEFAULT_APPLICATION_STAGES.filter((stage) => stage.key.startsWith('ROUND_'));
    expect(rounds).toHaveLength(4);
    expect(new Set(rounds.map((stage) => stage.tone)).size).toBe(rounds.length);
  });

  it('gives every stage a short label no longer than its full one', () => {
    const bad = ALL.filter(
      (stage) => !stage.shortLabel || stage.shortLabel.length > stage.label.length
    );
    expect(bad.map((stage) => stage.key)).toEqual([]);
  });

  it('reads a stage by its key, falling back to the filter-only statuses', () => {
    expect(findApplicationStatus('ROUND_2', DEFAULT_APPLICATION_STAGES)?.shortLabel).toBe('R2');
    expect(findApplicationStatus('ACCEPTED', DEFAULT_APPLICATION_STAGES)?.shortLabel).toBe(
      'Accepted'
    );
  });

  it('has no stage whose text would be unreadable on its own tone', () => {
    // The badge paints the tone solid in both themes, so contrast comes from the text colour.
    for (const stage of ALL) {
      const background = getPaletteColorFromTone(stage.tone).dot;
      expect(['#ffffff', '#000000']).toContain(getReadableTextColor(background).toLowerCase());
    }
  });

  it('says nothing for a key no stage claims', () => {
    expect(findApplicationStatus('NOT_A_STAGE', DEFAULT_APPLICATION_STAGES)).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import {
  availabilityGroupKey,
  effectiveRangeDays,
  groupAvailabilityRanges,
} from './availabilityGroups';

const WEEKDAYS = [0, 1, 2, 3, 4];
const block = (start: string, end: string, days?: number[]) => ({ start, end, days });

describe('effectiveRangeDays', () => {
  it('treats an absent day list as every work day', () => {
    expect(effectiveRangeDays(block('09:00:00', '17:00:00'), WEEKDAYS)).toEqual(WEEKDAYS);
  });

  it('drops a day that is no longer a work day', () => {
    expect(effectiveRangeDays(block('09:00:00', '17:00:00', [3, 4, 5]), WEEKDAYS)).toEqual([3, 4]);
  });

  it('sorts and dedupes, so the same set always keys the same group', () => {
    expect(effectiveRangeDays(block('09:00:00', '17:00:00', [4, 0, 4]), WEEKDAYS)).toEqual([0, 4]);
  });
});

describe('groupAvailabilityRanges', () => {
  it('puts two windows on the same days in one group', () => {
    const groups = groupAvailabilityRanges(
      [block('09:00:00', '12:00:00', [0, 1, 2]), block('13:00:00', '17:00:00', [0, 1, 2])],
      WEEKDAYS
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].days).toEqual([0, 1, 2]);
    expect(groups[0].blocks.map((entry) => entry.index)).toEqual([0, 1]);
  });

  it('keeps a different day set as its own group', () => {
    const groups = groupAvailabilityRanges(
      [
        block('09:00:00', '12:00:00', [0, 1, 2]),
        block('13:00:00', '17:00:00', [0, 1, 2]),
        block('09:00:00', '12:00:00', [3, 4]),
        block('13:00:00', '17:00:00', [3, 4]),
      ],
      WEEKDAYS
    );
    expect(groups.map((group) => group.days)).toEqual([
      [0, 1, 2],
      [3, 4],
    ]);
    expect(groups.map((group) => group.blocks.length)).toEqual([2, 2]);
  });

  it('carries the stored index through, since that is what the edit handlers take', () => {
    const groups = groupAvailabilityRanges(
      [block('13:00:00', '17:00:00', [4]), block('09:00:00', '12:00:00', [0])],
      WEEKDAYS
    );
    expect(groups[0].blocks[0].index).toBe(0);
    expect(groups[1].blocks[0].index).toBe(1);
  });

  it('orders blocks by start time so a card reads down the day', () => {
    const groups = groupAvailabilityRanges(
      [block('13:00:00', '17:00:00', [0]), block('09:00:00', '12:00:00', [0])],
      WEEKDAYS
    );
    expect(groups[0].blocks.map((entry) => entry.range.start)).toEqual(['09:00:00', '13:00:00']);
    // The stored index still points at the original row, not at the display position.
    expect(groups[0].blocks.map((entry) => entry.index)).toEqual([1, 0]);
  });

  it('groups by the day set a day-list change produces, not by the stored order', () => {
    const groups = groupAvailabilityRanges(
      [
        block('09:00:00', '12:00:00', [0]),
        block('09:00:00', '12:00:00', [1]),
        block('13:00:00', '17:00:00', [0]),
      ],
      WEEKDAYS
    );
    expect(groups.map((group) => group.blocks.length)).toEqual([2, 1]);
  });

  it('keeps a group with no days selected, so it can be fixed rather than vanishing', () => {
    const groups = groupAvailabilityRanges([block('09:00:00', '12:00:00', [])], WEEKDAYS);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('none');
  });

  it('gives an empty list no groups', () => {
    expect(groupAvailabilityRanges([], WEEKDAYS)).toEqual([]);
  });
});

describe('availabilityGroupKey', () => {
  it('is stable for the same set however it arrived', () => {
    expect(availabilityGroupKey([0, 1, 2])).toBe(availabilityGroupKey([0, 1, 2]));
    expect(availabilityGroupKey([0, 1])).not.toBe(availabilityGroupKey([0, 2]));
  });
});

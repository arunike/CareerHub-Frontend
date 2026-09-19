import type { AvailabilityTimeRange } from './availabilityHours';

export interface AvailabilityBlock {
  // Index into the stored flat array, which is what every edit handler takes.
  index: number;
  range: AvailabilityTimeRange;
}

export interface AvailabilityGroup {
  // The sorted day set, joined — stable across block edits, so it keys the expanded card.
  key: string;
  days: number[];
  blocks: AvailabilityBlock[];
}

// An absent `days` means every work day, and a day switched off in Work Days never counts.
export const effectiveRangeDays = (range: AvailabilityTimeRange, enabledDays: number[]): number[] =>
  [...new Set(range.days ?? enabledDays)]
    .filter((day) => enabledDays.includes(day))
    .sort((a, b) => a - b);

export const availabilityGroupKey = (days: number[]): string =>
  days.length === 0 ? 'none' : days.join('-');

// One card per day set: two windows on the same days are one pattern, not two unrelated rows.
export const groupAvailabilityRanges = (
  ranges: AvailabilityTimeRange[],
  enabledDays: number[]
): AvailabilityGroup[] => {
  const groups: AvailabilityGroup[] = [];
  const byKey = new Map<string, AvailabilityGroup>();

  ranges.forEach((range, index) => {
    const days = effectiveRangeDays(range, enabledDays);
    const key = availabilityGroupKey(days);
    const existing = byKey.get(key);
    if (existing) {
      existing.blocks.push({ index, range });
      return;
    }
    // First appearance fixes the group's position, so editing a time never reorders the list.
    const group: AvailabilityGroup = { key, days, blocks: [{ index, range }] };
    byKey.set(key, group);
    groups.push(group);
  });

  for (const group of groups) {
    group.blocks.sort((a, b) => (a.range.start || '').localeCompare(b.range.start || ''));
  }
  return groups;
};

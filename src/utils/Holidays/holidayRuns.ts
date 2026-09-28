import { daysApart } from '../localDay';

export interface RunMember {
  id?: number;
  date: string;
  group_id?: string | null;
}

export interface HolidayRun<T extends RunMember> {
  groupId: string;
  members: T[];
}

// Buckets holidays into the runs they belong to, which three views each worked out for themselves.
export const holidayRuns = <T extends RunMember>(
  holidays: T[],
  { splitOnGap = false }: { splitOnGap?: boolean } = {}
): HolidayRun<T>[] => {
  const byGroup = new Map<string, T[]>();
  for (const holiday of holidays) {
    const key = holiday.group_id || (holiday.id === undefined ? '' : `single-${holiday.id}`);
    if (!key) continue;
    const members = byGroup.get(key);
    // Two rows can share a date; one day away from work is one day.
    if (members) {
      if (!members.some((seen) => seen.date === holiday.date)) members.push(holiday);
    } else {
      byGroup.set(key, [holiday]);
    }
  }

  const runs: HolidayRun<T>[] = [];
  for (const [groupId, members] of byGroup) {
    const sorted = [...members].sort((a, b) => a.date.localeCompare(b.date));
    if (!splitOnGap) {
      runs.push({ groupId, members: sorted });
      continue;
    }
    // A day taken out of the middle of a trip splits it, so runs are cut where the dates skip.
    let run: T[] = [];
    const flush = () => {
      if (run.length > 0) runs.push({ groupId, members: run });
      run = [];
    };
    for (const member of sorted) {
      const previous = run[run.length - 1];
      // Rounded days, not exact milliseconds: a daylight-saving day is 23 or 25 hours long.
      if (previous && daysApart(previous.date, member.date) !== 1) flush();
      run.push(member);
    }
    flush();
  }
  return runs;
};

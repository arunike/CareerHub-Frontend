import { describe, expect, it } from 'vitest';
import {
  buildWeekSpans,
  eventSpanCandidates,
  holidayGroupCandidates,
  type SpanCandidate,
} from './spanLayout';
import type { Event, Holiday } from '../../types';

// 2026-06-28 is a Sunday, so these two arrays are real calendar weeks either side of 2026-07-01.
const weekOf = (sundayIso: string) =>
  Array.from({ length: 7 }, (_, offset) => {
    const day = new Date(`${sundayIso}T00:00:00`);
    day.setDate(day.getDate() + offset);
    return day;
  });

const FIRST_WEEK = weekOf('2026-06-28');
const SECOND_WEEK = weekOf('2026-07-05');

const holiday = (date: string, groupId?: string, over: Partial<Holiday> = {}) =>
  ({
    id: Number(date.replace(/-/g, '')),
    date,
    group_id: groupId,
    description: 'Time off',
    holiday_type: 'custom',
    ...over,
  }) as Holiday;

const event = (date: string, endDate?: string) =>
  ({
    id: date,
    date,
    end_date: endDate ?? null,
    name: 'Onsite',
    is_all_day: true,
  }) as never as Event;

const groupOf = (candidate: SpanCandidate) => {
  if (candidate.subject.kind !== 'holiday') throw new Error('expected a holiday candidate');
  return candidate.subject.group;
};

describe('holidayGroupCandidates', () => {
  it('turns the days of one group into a single span', () => {
    const candidates = holidayGroupCandidates([
      holiday('2026-07-01', 'g1'),
      holiday('2026-07-02', 'g1'),
      holiday('2026-07-03', 'g1'),
    ]);
    expect(candidates).toHaveLength(1);
    expect(groupOf(candidates[0])).toMatchObject({
      id: 'g1',
      start: '2026-07-01',
      end: '2026-07-03',
      days: 3,
    });
  });

  it('reads the extremes whatever order the rows arrive in', () => {
    const candidates = holidayGroupCandidates([
      holiday('2026-07-03', 'g1'),
      holiday('2026-07-01', 'g1'),
      holiday('2026-07-02', 'g1'),
    ]);
    expect(groupOf(candidates[0]).start).toBe('2026-07-01');
    expect(groupOf(candidates[0]).end).toBe('2026-07-03');
  });

  it('names the group after its earliest day, which is what a click should open', () => {
    const candidates = holidayGroupCandidates([
      holiday('2026-07-02', 'g1', { description: 'Second day' }),
      holiday('2026-07-01', 'g1', { description: 'First day' }),
    ]);
    expect(groupOf(candidates[0]).holiday.description).toBe('First day');
  });

  it('leaves a lone day as a chip, since a one-cell bar only adds a border', () => {
    expect(holidayGroupCandidates([holiday('2026-07-01', 'g1')])).toEqual([]);
  });

  it('ignores time off that was never grouped', () => {
    expect(holidayGroupCandidates([holiday('2026-07-01'), holiday('2026-07-02')])).toEqual([]);
  });

  it('keeps separate groups apart', () => {
    const candidates = holidayGroupCandidates([
      holiday('2026-07-01', 'g1'),
      holiday('2026-07-02', 'g1'),
      holiday('2026-07-08', 'g2'),
      holiday('2026-07-09', 'g2'),
    ]);
    expect(candidates.map((candidate) => groupOf(candidate).id).sort()).toEqual(['g1', 'g2']);
  });

  it('counts a duplicated date once, so a repeated row cannot inflate the length', () => {
    const candidates = holidayGroupCandidates([
      holiday('2026-07-01', 'g1'),
      holiday('2026-07-01', 'g1'),
      holiday('2026-07-02', 'g1'),
    ]);
    expect(groupOf(candidates[0]).days).toBe(2);
  });
});

describe('buildWeekSpans over a holiday group', () => {
  const candidates = holidayGroupCandidates([
    holiday('2026-07-03', 'trip'),
    holiday('2026-07-04', 'trip'),
    holiday('2026-07-05', 'trip'),
  ]);

  it('fills the columns the group covers in that week', () => {
    const { spans } = buildWeekSpans(FIRST_WEEK, candidates);
    // 3 Jul is a Friday, so the bar runs from column 5 to the Saturday edge.
    expect(spans[0]).toMatchObject({ startCol: 5, endCol: 6, continuesLeft: false });
  });

  it('draws the week-boundary edges flat, which is what makes it read as one bar', () => {
    expect(buildWeekSpans(FIRST_WEEK, candidates).spans[0].continuesRight).toBe(true);
    const second = buildWeekSpans(SECOND_WEEK, candidates).spans[0];
    expect(second).toMatchObject({ startCol: 0, endCol: 0, continuesLeft: true });
    expect(second.continuesRight).toBe(false);
  });

  it('says nothing for a week the group does not touch', () => {
    expect(buildWeekSpans(weekOf('2026-07-12'), candidates).spans).toEqual([]);
  });

  it('stacks a holiday and an event in different lanes, so neither hides the other', () => {
    const { spans, lanes } = buildWeekSpans(FIRST_WEEK, [
      ...eventSpanCandidates([event('2026-07-02', '2026-07-04')]),
      ...candidates,
    ]);
    expect(lanes).toBe(2);
    expect(new Set(spans.map((span) => span.lane))).toEqual(new Set([0, 1]));
  });

  it('reuses a lane once the earlier span has ended', () => {
    const twoApart = holidayGroupCandidates([
      holiday('2026-06-28', 'a'),
      holiday('2026-06-29', 'a'),
      holiday('2026-07-03', 'b'),
      holiday('2026-07-04', 'b'),
    ]);
    expect(buildWeekSpans(FIRST_WEEK, twoApart).lanes).toBe(1);
  });
});

describe('a trip split by taking a day out of it', () => {
  it('becomes two bars rather than one spanning the gap', () => {
    const candidates = holidayGroupCandidates([
      holiday('2026-07-01', 'trip'),
      holiday('2026-07-02', 'trip'),
      // 3 Jul was detached, so the group skips it.
      holiday('2026-07-04', 'trip'),
      holiday('2026-07-05', 'trip'),
    ]);
    expect(candidates).toHaveLength(2);
    expect(
      candidates.map((candidate) => [groupOf(candidate).start, groupOf(candidate).end])
    ).toEqual([
      ['2026-07-01', '2026-07-02'],
      ['2026-07-04', '2026-07-05'],
    ]);
  });

  it('leaves a one-day leftover as a chip rather than a bar', () => {
    const candidates = holidayGroupCandidates([
      holiday('2026-07-01', 'trip'),
      holiday('2026-07-03', 'trip'),
      holiday('2026-07-04', 'trip'),
    ]);
    expect(candidates).toHaveLength(1);
    expect(groupOf(candidates[0]).start).toBe('2026-07-03');
  });

  it('lists the dates it covers, which is how the cells below know to drop their chips', () => {
    const candidates = holidayGroupCandidates([
      holiday('2026-07-01', 'trip'),
      holiday('2026-07-02', 'trip'),
      holiday('2026-07-04', 'trip'),
    ]);
    expect(groupOf(candidates[0]).dates).toEqual(['2026-07-01', '2026-07-02']);
  });

  it('gives each run its own id, so two bars of one trip are distinct', () => {
    const candidates = holidayGroupCandidates([
      holiday('2026-07-01', 'trip'),
      holiday('2026-07-02', 'trip'),
      holiday('2026-07-04', 'trip'),
      holiday('2026-07-05', 'trip'),
    ]);
    expect(new Set(candidates.map((candidate) => candidate.id)).size).toBe(2);
  });
});

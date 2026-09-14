import { describe, expect, it } from 'vitest';
import {
  COMMUTE_TIME_WAGE_FRACTION,
  MAX_TIME_PENALTY,
  TIME_PENALTY_HALF_HOURS,
  commuteTimeCost,
  commuteTimePenalty,
} from './commute';

// minutes each way, days a week -> annual hours, using the same 52-week year the app does.
const hours = (minutesEachWay: number, daysPerWeek: number) =>
  (minutesEachWay * 2 * daysPerWeek * 52) / 60;

describe('commuteTimePenalty', () => {
  it('is nothing for no commute', () => {
    expect(commuteTimePenalty(0)).toBe(0);
    expect(commuteTimePenalty(-10)).toBe(0);
    expect(commuteTimePenalty(Number.NaN)).toBe(0);
  });

  it('keeps separating commutes the old capped model scored identically', () => {
    const fortyFive = commuteTimePenalty(hours(45, 5));
    const sixty = commuteTimePenalty(hours(60, 5));
    const ninety = commuteTimePenalty(hours(90, 5));
    expect(sixty).toBeGreaterThan(fortyFive);
    expect(ninety).toBeGreaterThan(sixty);
  });

  it('rises with every extra hour, never flattening', () => {
    for (const annual of [50, 200, 400, 800, 1600]) {
      expect(commuteTimePenalty(annual + 25)).toBeGreaterThan(commuteTimePenalty(annual));
    }
  });

  it('gives half the maximum at the half-way hours', () => {
    expect(commuteTimePenalty(TIME_PENALTY_HALF_HOURS)).toBeCloseTo(MAX_TIME_PENALTY / 2, 6);
  });

  it('never reaches the maximum, however long the commute', () => {
    expect(commuteTimePenalty(100000)).toBeLessThan(MAX_TIME_PENALTY);
    expect(commuteTimePenalty(100000)).toBeGreaterThan(MAX_TIME_PENALTY - 1);
  });

  it('costs a short hybrid commute far less than a long daily one', () => {
    expect(commuteTimePenalty(hours(20, 2))).toBeLessThan(10);
    expect(commuteTimePenalty(hours(75, 5))).toBeGreaterThan(19);
  });
});

describe('commuteTimeCost', () => {
  it('values the hours at a fraction of the hourly rate', () => {
    // $166,400 over 2,080 hours is $80 an hour; 200 hours at half of that is $8,000.
    expect(commuteTimeCost(200, 166400)).toBeCloseTo(200 * 80 * COMMUTE_TIME_WAGE_FRACTION);
  });

  it('is nothing without a salary or without hours', () => {
    expect(commuteTimeCost(200, 0)).toBe(0);
    expect(commuteTimeCost(0, 166400)).toBe(0);
  });

  it('scales with the length of the commute', () => {
    expect(commuteTimeCost(400, 166400)).toBeCloseTo(commuteTimeCost(200, 166400) * 2);
  });
});

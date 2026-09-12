import { describe, expect, it } from 'vitest';
import { costPatchForMode, defaultCostModeFor, supportsFuelCosting } from './commute';
import type { CommuteOption } from './commute';

const option = (over: Partial<CommuteOption> = {}) =>
  ({
    mode: 'TRAIN',
    minutes_each_way: 30,
    cost_value: 0,
    cost_frequency: 'MONTHLY',
    ...over,
  }) as CommuteOption;

describe('defaultCostModeFor', () => {
  it('opens a car on gas and miles, which is how a car actually costs', () => {
    expect(defaultCostModeFor('CAR')).toBe('FUEL');
  });

  it('leaves a fare-based mode on a fixed amount', () => {
    expect(defaultCostModeFor('TRAIN')).toBe('FIXED');
    expect(defaultCostModeFor('BUS')).toBe('FIXED');
    expect(defaultCostModeFor('BIKE')).toBe('FIXED');
  });

  it('offers fuel costing for Other without assuming it', () => {
    // A catch-all could be a scooter or a ferry, so it keeps the option but not the default.
    expect(supportsFuelCosting('OTHER')).toBe(true);
    expect(defaultCostModeFor('OTHER')).toBe('FIXED');
  });
});

describe('costPatchForMode', () => {
  it('switches a fare row over to gas and miles when it becomes a car', () => {
    expect(costPatchForMode('CAR', option({ cost_mode: 'FIXED' }))).toEqual({
      cost_mode: 'FUEL',
      distance_basis: 'ONE_WAY',
    });
  });

  it('treats a legacy row with no cost mode the same way', () => {
    expect(costPatchForMode('CAR', option())).toEqual({
      cost_mode: 'FUEL',
      distance_basis: 'ONE_WAY',
    });
  });

  it('keeps a distance basis the user already chose', () => {
    expect(costPatchForMode('CAR', option({ distance_basis: 'ROUND_TRIP' }))).toEqual({
      cost_mode: 'FUEL',
      distance_basis: 'ROUND_TRIP',
    });
  });

  it('changes nothing for a car already on gas and miles', () => {
    expect(costPatchForMode('CAR', option({ cost_mode: 'FUEL' }))).toEqual({});
  });

  it('drops fuel costing when the mode can no longer support it', () => {
    // The Cost select hides the fuel option for a train, so leaving it set showed no valid value.
    expect(costPatchForMode('TRAIN', option({ cost_mode: 'FUEL' }))).toEqual({
      cost_mode: 'FIXED',
    });
  });

  it('leaves an already-fixed fare row alone', () => {
    expect(costPatchForMode('BUS', option({ cost_mode: 'FIXED' }))).toEqual({});
  });

  it('does not force a mode change on Other', () => {
    expect(costPatchForMode('OTHER', option({ cost_mode: 'FIXED' }))).toEqual({});
    expect(costPatchForMode('OTHER', option({ cost_mode: 'FUEL' }))).toEqual({});
  });
});

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MILES_PER_KWH,
  DEFAULT_PRICE_PER_KWH,
  energyTypeOf,
  fuelBreakdownFor,
  type CommuteOption,
} from './commute';

const OFFICE_DAYS = 200;

const car = (over: Partial<CommuteOption> = {}): CommuteOption => ({
  mode: 'CAR',
  minutes_each_way: 30,
  cost_value: 0,
  cost_frequency: 'YEARLY',
  cost_mode: 'FUEL',
  miles_each_way: 10,
  distance_basis: 'ONE_WAY',
  ...over,
});

describe('energyTypeOf', () => {
  it('reads a legacy option with no energy type as petrol', () => {
    expect(energyTypeOf(car())).toBe('GAS');
  });

  it('reads an electric option as electric', () => {
    expect(energyTypeOf(car({ energy_type: 'ELECTRIC' }))).toBe('ELECTRIC');
  });
});

describe('fuelBreakdownFor on petrol', () => {
  it('costs miles through mpg and the pump price', () => {
    const fuel = fuelBreakdownFor(car({ mpg: 20, gas_price_per_gallon: 5 }), OFFICE_DAYS)!;
    // 10 mi each way, so 20 a day over 200 days = 4,000 miles = 200 gallons at $5.
    expect(fuel.annualMiles).toBe(4000);
    expect(fuel.energyUnits).toBe(200);
    expect(fuel.energyUnitLabel).toBe('gal');
    expect(fuel.energyCost).toBe(1000);
  });

  it('never treats a petrol car as charging at the office', () => {
    const fuel = fuelBreakdownFor(
      car({ mpg: 20, gas_price_per_gallon: 5, free_workplace_charging: true }),
      OFFICE_DAYS
    )!;
    expect(fuel.chargingCovered).toBe(false);
    expect(fuel.energyCost).toBe(1000);
  });
});

describe('fuelBreakdownFor on electric', () => {
  const ev = (over: Partial<CommuteOption> = {}) =>
    car({ energy_type: 'ELECTRIC', miles_per_kwh: 4, price_per_kwh: 0.2, ...over });

  it('costs miles through efficiency and the unit price', () => {
    const fuel = fuelBreakdownFor(ev(), OFFICE_DAYS)!;
    // 4,000 miles at 4 mi/kWh = 1,000 kWh at $0.20.
    expect(fuel.energyUnits).toBe(1000);
    expect(fuel.energyUnitLabel).toBe('kWh');
    expect(fuel.energyCost).toBeCloseTo(200, 6);
  });

  it('ignores the petrol inputs entirely', () => {
    const fuel = fuelBreakdownFor(ev({ mpg: 5, gas_price_per_gallon: 99 }), OFFICE_DAYS)!;
    expect(fuel.energyCost).toBeCloseTo(200, 6);
  });

  it('falls back to the built-in efficiency and price when neither is entered', () => {
    const fuel = fuelBreakdownFor(car({ energy_type: 'ELECTRIC' }), OFFICE_DAYS)!;
    expect(fuel.energyUnits).toBeCloseTo(4000 / DEFAULT_MILES_PER_KWH, 6);
    expect(fuel.energyCost).toBeCloseTo((4000 / DEFAULT_MILES_PER_KWH) * DEFAULT_PRICE_PER_KWH, 6);
  });
});

describe('free charging at the office', () => {
  const ev = (over: Partial<CommuteOption> = {}) =>
    car({ energy_type: 'ELECTRIC', miles_per_kwh: 4, price_per_kwh: 0.2, ...over });

  it('takes the electricity to zero', () => {
    const fuel = fuelBreakdownFor(ev({ free_workplace_charging: true }), OFFICE_DAYS)!;
    expect(fuel.chargingCovered).toBe(true);
    expect(fuel.energyCost).toBe(0);
  });

  it('still counts the kWh, so the saving is visible rather than hidden', () => {
    const fuel = fuelBreakdownFor(ev({ free_workplace_charging: true }), OFFICE_DAYS)!;
    expect(fuel.energyUnits).toBe(1000);
  });

  it('leaves parking and tolls to pay', () => {
    const fuel = fuelBreakdownFor(
      ev({ free_workplace_charging: true, parking_tolls_per_day: 12 }),
      OFFICE_DAYS
    )!;
    expect(fuel.parkingCost).toBe(2400);
    expect(fuel.annualCost).toBe(2400);
  });

  it('is what makes the commute cheaper than the same car paying for power', () => {
    const paying = fuelBreakdownFor(ev(), OFFICE_DAYS)!;
    const free = fuelBreakdownFor(ev({ free_workplace_charging: true }), OFFICE_DAYS)!;
    expect(free.annualCost).toBeLessThan(paying.annualCost);
    expect(paying.annualCost - free.annualCost).toBeCloseTo(200, 6);
  });

  it('only applies to an electric car', () => {
    const petrol = fuelBreakdownFor(
      car({ mpg: 20, gas_price_per_gallon: 5, free_workplace_charging: true }),
      OFFICE_DAYS
    )!;
    expect(petrol.chargingCovered).toBe(false);
    expect(
      fuelBreakdownFor(ev({ free_workplace_charging: true }), OFFICE_DAYS)!.chargingCovered
    ).toBe(true);
  });
});

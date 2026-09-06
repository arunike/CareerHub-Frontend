import type { BenefitsSectionProps } from './BenefitsSection';
import type { freeFoodBreakdown } from '../freeFood';
import UnitNumberInput from '../../../components/UnitNumberInput';
import CollapsibleGroup from './CollapsibleGroup';
import { DEFAULT_MEAL_VALUES, MEALS, MEAL_LABELS, type MealEntry } from '../freeFood';
import { CONTROL_CLASS } from '../../../components/formControls';

type Props = BenefitsSectionProps & {
  food: ReturnType<typeof freeFoodBreakdown>;
  mealEntries: MealEntry[];
  setMealEntries: (next: MealEntry[]) => void;
};

const FreeFoodGroup = ({
  food,
  mealEntries,
  setMealEntries,
  legacyFreeFoodAnnual,
  officeDays,
}: Props) => (
  <CollapsibleGroup
    title="6. Food on Office Days"
    hasValue={mealEntries.length > 0}
    summary={
      food
        ? `${food.netAnnual >= 0 ? '+' : '−'}$${Math.abs(Math.round(food.netAnnual)).toLocaleString()}/yr`
        : undefined
    }
  >
    <div className="space-y-3">
      <p className="text-[11px] leading-4 text-slate-500 dark:text-ink-400">
        Meals you would eat on an office day. Mark the ones the office provides — those are money
        you keep; the rest are money you spend, counted over{' '}
        <span className="font-semibold text-slate-600 dark:text-ink-200">
          {Math.round(officeDays ?? 0)} office days
        </span>{' '}
        a year.
      </p>

      <div className="space-y-2">
        {MEALS.map((meal) => {
          const entry = mealEntries.find((item) => item.meal === meal);
          const active = Boolean(entry);
          return (
            <div
              key={meal}
              className="grid grid-cols-[minmax(0,1fr)_104px_124px] items-center gap-2"
            >
              <button
                type="button"
                aria-pressed={active}
                onClick={() =>
                  active
                    ? setMealEntries(mealEntries.filter((item) => item.meal !== meal))
                    : setMealEntries([
                        ...mealEntries,
                        { meal, value: DEFAULT_MEAL_VALUES[meal], provided: true },
                      ])
                }
                // 38px to match CONTROL_CLASS; at 36px the row shared no edge.
                className={`min-h-11 rounded-lg border px-3 text-left text-sm font-medium transition-colors sm:h-[38px] sm:min-h-0 ${
                  active
                    ? 'border-slate-300 dark:border-white/[0.12] bg-white dark:bg-ink-900 text-slate-900 dark:text-ink-50'
                    : 'border-dashed border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 text-slate-400 dark:text-ink-500 hover:text-slate-600'
                }`}
              >
                {MEAL_LABELS[meal]}
              </button>

              <UnitNumberInput
                unit="$"
                min={0}
                value={entry ? entry.value || null : null}
                disabled={!active}
                onChange={(value) =>
                  setMealEntries(
                    mealEntries.map((item) =>
                      item.meal === meal ? { ...item, value: value ?? 0 } : item
                    )
                  )
                }
                placeholder={String(DEFAULT_MEAL_VALUES[meal])}
                aria-label={`${MEAL_LABELS[meal]} value`}
              />

              <select
                value={entry?.provided === false ? 'PAY' : 'FREE'}
                disabled={!active}
                onChange={(event) =>
                  setMealEntries(
                    mealEntries.map((item) =>
                      item.meal === meal
                        ? { ...item, provided: event.target.value === 'FREE' }
                        : item
                    )
                  )
                }
                className={`${CONTROL_CLASS} disabled:opacity-50`}
                aria-label={`Who pays for ${MEAL_LABELS[meal]}`}
              >
                <option value="FREE">Provided</option>
                <option value="PAY">I pay</option>
              </select>
            </div>
          );
        })}
      </div>

      <p className="rounded-lg bg-slate-50 dark:bg-ink-900 px-2.5 py-2 text-[11px] leading-4 text-slate-500 dark:text-ink-400 tabular-nums">
        {food ? (
          <>
            {food.savedAnnual > 0 && (
              <>
                ${Math.round(food.savedAnnual).toLocaleString()} provided
                {food.outOfPocketAnnual > 0 && ' · '}
              </>
            )}
            {food.outOfPocketAnnual > 0 && (
              <>−${Math.round(food.outOfPocketAnnual).toLocaleString()} out of pocket</>
            )}{' '}
            ={' '}
            <span
              className={`font-semibold ${food.netAnnual >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}
            >
              {food.netAnnual >= 0 ? '+' : '−'}$
              {Math.abs(Math.round(food.netAnnual)).toLocaleString()}/yr
            </span>
          </>
        ) : (
          <span className="text-slate-400 dark:text-ink-500">
            {(officeDays ?? 0) <= 0
              ? 'No office days for this offer, so meals there cost nothing either way.'
              : 'Add the meals you would eat on an office day.'}
          </span>
        )}
      </p>

      {!food && (legacyFreeFoodAnnual ?? 0) > 0 && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300">
          Still using the old flat total of $
          {Math.round(legacyFreeFoodAnnual ?? 0).toLocaleString()}/yr. Add meals above to replace
          it.
        </p>
      )}
    </div>
  </CollapsibleGroup>
);

export default FreeFoodGroup;

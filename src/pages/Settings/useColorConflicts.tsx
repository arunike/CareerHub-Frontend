import { useMemo } from 'react';
import type { EventCategory, UserSettings } from '../../types';
import {
  describeClashes,
  findClashesWith,
  findColorConflicts,
  suggestFreeColor,
  type ColorOwner,
} from '../../utils/colorConflicts';
import { getPaletteColor } from '../../utils/colorPalette';
import {
  FEDERAL_HOLIDAY_COLOR,
  FEDERAL_HOLIDAY_LABEL,
  UNTABBED_HOLIDAY_COLOR,
  UNTABBED_HOLIDAY_LABEL,
} from '../../utils/holidayTabColors';

export const useColorConflicts = ({
  categories,
  settings,
}: {
  categories: EventCategory[];
  settings: UserSettings | null;
}) => {
  const colorOwners = useMemo<ColorOwner[]>(
    () => [
      ...categories.map((category) => ({
        kind: 'category' as const,
        label: category.name,
        color: category.color,
      })),
      {
        kind: 'holiday' as const,
        label: UNTABBED_HOLIDAY_LABEL,
        color: settings?.default_holiday_color ?? UNTABBED_HOLIDAY_COLOR,
      },
      {
        kind: 'holiday' as const,
        label: FEDERAL_HOLIDAY_LABEL,
        color: settings?.federal_holiday_color ?? FEDERAL_HOLIDAY_COLOR,
      },
      ...(settings?.holiday_tabs ?? []).map((tab) => ({
        kind: 'holiday' as const,
        label: tab.name,
        color: tab.color,
      })),
    ],
    [categories, settings]
  );
  const colorConflicts = useMemo(() => findColorConflicts(colorOwners), [colorOwners]);

  const freeColorSuggestion = useMemo(() => suggestFreeColor(colorOwners), [colorOwners]);

  // Sits under the picker, so a clash shows while choosing rather than after saving.
  const renderClashNotice = (
    color: string | null | undefined,
    excluding?: { kind: 'category' | 'holiday'; label: string }
  ) => {
    const clashes = findClashesWith(colorOwners, color, excluding);
    if (clashes.length === 0) return null;
    return (
      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-4 text-amber-700">
        <span
          className="mt-1 h-2 w-2 shrink-0 rounded-full ring-1 ring-amber-300"
          style={{ backgroundColor: getPaletteColor(color).dot }}
        />
        <span>
          {describeClashes(clashes)}
          {freeColorSuggestion ? ` Nothing is using ${freeColorSuggestion} yet.` : ''}
        </span>
      </p>
    );
  };

  return { colorOwners, colorConflicts, renderClashNotice, freeColorSuggestion };
};

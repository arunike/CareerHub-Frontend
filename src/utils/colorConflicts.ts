import { USER_COLOR_PALETTE, getPaletteColor } from './colorPalette';

// Event categories and holiday colours are drawn side by side on the calendar, so two of
// them sharing a shade makes the calendar lie: Work events and time off both rendered
// blue is indistinguishable at a glance. This finds those collisions so the UI can say so.

export type ColorOwnerKind = 'category' | 'holiday';

export interface ColorOwner {
  kind: ColorOwnerKind;
  label: string;
  color?: string | null;
}

export interface ColorConflict {
  // Resolved swatch the clashing entries share.
  dot: string;
  owners: ColorOwner[];
  // True when the clash spans both kinds, which is the case that actually misleads.
  crossKind: boolean;
}

const resolve = (color?: string | null) => getPaletteColor(color).dot.toLowerCase();

export const findColorConflicts = (owners: ColorOwner[]): ColorConflict[] => {
  const byDot = new Map<string, ColorOwner[]>();
  owners.forEach((owner) => {
    if (!owner.label.trim()) return;
    const dot = resolve(owner.color);
    byDot.set(dot, [...(byDot.get(dot) ?? []), owner]);
  });

  return (
    [...byDot.entries()]
      .filter(([, group]) => group.length > 1)
      .map(([dot, group]) => ({
        dot,
        owners: group,
        crossKind: group.some((owner) => owner.kind !== group[0].kind),
      }))
      // The cross-kind clashes matter most, so surface them first.
      .sort((a, b) => Number(b.crossKind) - Number(a.crossKind))
  );
};

// A palette colour nothing is using yet, so the warning can offer a way out rather than
// just pointing at the problem.
export const suggestFreeColor = (owners: ColorOwner[]) => {
  const taken = new Set(
    owners.filter((owner) => owner.label.trim()).map((owner) => resolve(owner.color))
  );
  return USER_COLOR_PALETTE.find((option) => !taken.has(option.dot.toLowerCase()))?.value ?? null;
};

export const describeConflict = (conflict: ColorConflict) => {
  const names = conflict.owners.map((owner) => `“${owner.label}”`);
  const last = names.pop();
  const list = names.length ? `${names.join(', ')} and ${last}` : last;
  return `${list} share a colour, so they look identical on the calendar.`;
};

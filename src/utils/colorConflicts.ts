import { USER_COLOR_PALETTE, getPaletteColor } from './colorPalette';

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

// A palette colour nothing is using yet, so the warning can offer a way out.
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

// `excluding` skips the entry being edited so it never clashes with itself.
export const findClashesWith = (
  owners: ColorOwner[],
  color: string | null | undefined,
  excluding?: { kind: ColorOwnerKind; label: string }
) => {
  const target = resolve(color);
  return owners.filter(
    (owner) =>
      owner.label.trim() &&
      resolve(owner.color) === target &&
      !(excluding && owner.kind === excluding.kind && owner.label === excluding.label)
  );
};

export const describeClashes = (owners: ColorOwner[]) => {
  const names = owners.map((owner) => `“${owner.label}”`);
  const last = names.pop();
  const list = names.length ? `${names.join(', ')} and ${last}` : last;
  return `Already used by ${list} — they will look identical on the calendar.`;
};

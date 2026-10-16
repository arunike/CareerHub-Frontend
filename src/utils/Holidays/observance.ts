// The ignore list is keyed by either the name or the date, so both forms go when a day is observed.
export const ignoreListAfter = (
  list: string[],
  name: string,
  date: string,
  observed: boolean
): string[] => {
  if (observed) return list.filter((entry) => entry !== name && entry !== date);
  return list.includes(name) || list.includes(date) ? list : [...list, name];
};

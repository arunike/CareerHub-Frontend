export const getAvailableYears = <T extends Record<string, any>>(
  items: T[],
  dateField: keyof T
): number[] => {
  const years = items
    .map((item) => {
      const dateValue = item[dateField];
      if (!dateValue) return null;
      return new Date(dateValue as string).getFullYear();
    })
    .filter((year): year is number => year !== null && !isNaN(year));

  return [...new Set(years)].sort((a, b) => b - a);
};

export const filterByYear = <T extends Record<string, any>>(
  items: T[],
  year: number | 'all',
  dateField: keyof T
): T[] => {
  if (year === 'all') return items;

  return items.filter((item) => {
    const dateValue = item[dateField];
    if (!dateValue) return false;
    const itemYear = new Date(dateValue as string).getFullYear();
    return itemYear === year;
  });
};

export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

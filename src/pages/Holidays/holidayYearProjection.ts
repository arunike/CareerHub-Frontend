import dayjs from 'dayjs';
import type { Holiday } from '../../types';

const projectDateToYear = (date: string, year: number) => dayjs(date).year(year);

export const projectHolidaysForYear = (
  holidays: Holiday[],
  selectedYear: number | 'all'
): Holiday[] => {
  if (selectedYear === 'all') return holidays;

  const projectedHolidays: Holiday[] = [];
  const recurringGroups = new Map<string, Holiday[]>();

  holidays.forEach((holiday) => {
    if (holiday.is_recurring && holiday.group_id) {
      const group = recurringGroups.get(holiday.group_id) || [];
      group.push(holiday);
      recurringGroups.set(holiday.group_id, group);
      return;
    }

    if (holiday.is_recurring) {
      projectedHolidays.push({
        ...holiday,
        date: projectDateToYear(holiday.date, selectedYear).format('YYYY-MM-DD'),
      });
      return;
    }

    if (dayjs(holiday.date).year() === selectedYear) {
      projectedHolidays.push(holiday);
    }
  });

  recurringGroups.forEach((group) => {
    const orderedGroup = [...group].sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
    const sourceStart = dayjs(orderedGroup[0].date);
    const projectedStart = projectDateToYear(orderedGroup[0].date, selectedYear);

    orderedGroup.forEach((holiday) => {
      const offsetDays = dayjs(holiday.date).diff(sourceStart, 'day');
      projectedHolidays.push({
        ...holiday,
        date: projectedStart.add(offsetDays, 'day').format('YYYY-MM-DD'),
      });
    });
  });

  return projectedHolidays;
};

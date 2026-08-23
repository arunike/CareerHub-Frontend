import { addWeeks, format, isSameMonth, isSameWeek, parseISO } from 'date-fns';
import type { Availability as AvailabilityType } from '../../types';
import { canMergeAvailabilityDates } from './availabilityFormTypes';

export type AvailabilityGroup = { title: string; items: AvailabilityType[] };

export const groupAvailabilityByWeek = (
  data: AvailabilityType[],
  startDate: string
): AvailabilityGroup[] => {
  if (!data.length) return [];

  const start = parseISO(startDate);
  const groups: AvailabilityGroup[] = [
    { title: 'This Week', items: [] },
    { title: 'Next Week', items: [] },
    { title: 'The Following Week', items: [] },
  ];

  data.forEach((item) => {
    const itemDate = parseISO(item.date);

    if (isSameWeek(itemDate, start, { weekStartsOn: 1 })) {
      groups[0].items.push(item);
    } else if (isSameWeek(itemDate, addWeeks(start, 1), { weekStartsOn: 1 })) {
      groups[1].items.push(item);
    } else if (isSameWeek(itemDate, addWeeks(start, 2), { weekStartsOn: 1 })) {
      groups[2].items.push(item);
    } else {
      let lastGroup = groups.find((group) => group.title === 'Later');
      if (!lastGroup) {
        lastGroup = { title: 'Later', items: [] };
        groups.push(lastGroup);
      }
      lastGroup.items.push(item);
    }
  });

  return groups.filter((group) => group.items.length > 0);
};

const formatRange = (start: AvailabilityType, end: AvailabilityType) => {
  const sDate = parseISO(start.date);
  const eDate = parseISO(end.date);
  let dateStr = '';

  if (start.date === end.date) {
    dateStr = `${start.readable_date}`;
  } else if (isSameMonth(sDate, eDate)) {
    dateStr = `${format(sDate, 'MMM d')} - ${format(eDate, 'd')}`;
  } else {
    dateStr = `${format(sDate, 'MMM d')} - ${format(eDate, 'MMM d')}`;
  }

  return {
    displayDate: dateStr,
    availability: start.availability || 'Unknown',
    fullText: `${dateStr}, ${start.availability || 'Unknown'}`,
  };
};

export const processGroupItems = (items: AvailabilityType[], textMode: 'detailed' | 'combined') => {
  if (textMode === 'detailed')
    return items.map((item) => ({
      ...item,
      displayDate: `${item.day_name}, ${item.readable_date}`,
      availability: item.availability || 'Unknown',
      fullText: `${item.day_name}, ${item.readable_date}, ${item.availability || 'Unknown'}`,
    }));

  const condensed: { displayDate: string; availability: string; fullText: string }[] = [];

  if (items.length === 0) return [];

  let currentStart = items[0];
  let currentEnd = items[0];

  for (let i = 1; i < items.length; i++) {
    const canMerge =
      items[i].availability === currentStart.availability &&
      canMergeAvailabilityDates(currentEnd.date, items[i].date);

    if (canMerge) {
      currentEnd = items[i];
    } else {
      condensed.push(formatRange(currentStart, currentEnd));
      currentStart = items[i];
      currentEnd = items[i];
    }
  }
  condensed.push(formatRange(currentStart, currentEnd));

  return condensed;
};

export const buildAvailabilityCopyText = (
  groups: AvailabilityGroup[],
  textMode: 'detailed' | 'combined',
  timezone: string
) => {
  let text = `Availability Schedule (${timezone}):\n`;
  text += '--------------------------------------------------\n';

  groups.forEach((group) => {
    text += `${group.title}:\n`;
    processGroupItems(group.items, textMode).forEach((item) => {
      text += `${item.fullText}\n`;
    });
    text += '\n';
  });

  return text.trim();
};

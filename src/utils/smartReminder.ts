import dayjs, { type Dayjs } from 'dayjs';
import type { Task } from '../types';

export type SmartReminderDraft = {
  title: string;
  dueDate: Dayjs;
  priority: Task['priority'];
  matchedPhrase: string;
};

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const tidyTitle = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .replace(/\b(remind me to|reminder to|remember to)\b/i, '')
    .replace(/\s+(today|tonight|tomorrow)\b/i, '')
    .replace(/\s+\b(in|after)\s+\d+\s+(day|days|week|weeks)\b/i, '')
    .replace(/\s+\bnext\s+(sun(day)?|mon(day)?|tue(s|sday)?|wed(nesday)?|thu(rs|rsday)?|fri(day)?|sat(urday)?)\b/i, '')
    .trim();

const nextWeekday = (base: Dayjs, weekday: number) => {
  const diff = (weekday + 7 - base.day()) % 7;
  return base.add(diff === 0 ? 7 : diff, 'day');
};

const detectPriority = (text: string, dueDate: Dayjs): Task['priority'] => {
  const lower = text.toLowerCase();
  const daysUntil = dueDate.startOf('day').diff(dayjs().startOf('day'), 'day');

  if (/\b(deadline|offer deadline|urgent|final|expires?|due)\b/.test(lower)) return 'HIGH';
  if (/\b(interview|onsite|phone screen|screen|prep|prepare)\b/.test(lower) && daysUntil <= 2) return 'HIGH';
  if (daysUntil <= 1) return 'HIGH';
  if (daysUntil <= 7 || /\b(follow up|follow-up|recruiter|email)\b/.test(lower)) return 'MEDIUM';
  return 'LOW';
};

export const parseSmartReminder = (input: string, baseDate: Dayjs = dayjs()): SmartReminderDraft | null => {
  const text = input.trim();
  if (!text) return null;

  const lower = text.toLowerCase();
  let dueDate: Dayjs | null = null;
  let matchedPhrase = '';

  const relative = lower.match(/\b(in|after)\s+(\d{1,3})\s+(day|days|week|weeks)\b/);
  if (relative) {
    const amount = Number(relative[2]);
    const unit = relative[3].startsWith('week') ? 'week' : 'day';
    dueDate = baseDate.add(amount, unit).startOf('day');
    matchedPhrase = relative[0];
  }

  if (!dueDate && /\btomorrow\b/.test(lower)) {
    dueDate = baseDate.add(1, 'day').startOf('day');
    matchedPhrase = 'tomorrow';
  }

  if (!dueDate && /\b(today|tonight)\b/.test(lower)) {
    dueDate = baseDate.startOf('day');
    matchedPhrase = lower.includes('tonight') ? 'tonight' : 'today';
  }

  const weekday = lower.match(/\bnext\s+(sun(day)?|mon(day)?|tue(s|sday)?|wed(nesday)?|thu(rs|rsday)?|fri(day)?|sat(urday)?)\b/);
  if (!dueDate && weekday) {
    const target = WEEKDAY_INDEX[weekday[1]];
    if (typeof target === 'number') {
      dueDate = nextWeekday(baseDate.startOf('day'), target);
      matchedPhrase = weekday[0];
    }
  }

  if (!dueDate) {
    const bareDays = lower.match(/\b(\d{1,3})\s+(day|days|week|weeks)\b/);
    if (bareDays) {
      const amount = Number(bareDays[1]);
      const unit = bareDays[2].startsWith('week') ? 'week' : 'day';
      dueDate = baseDate.add(amount, unit).startOf('day');
      matchedPhrase = bareDays[0];
    }
  }

  if (!dueDate) return null;

  const title = tidyTitle(text) || text;

  return {
    title,
    dueDate,
    priority: detectPriority(text, dueDate),
    matchedPhrase,
  };
};

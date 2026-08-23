import dayjs, { type Dayjs } from 'dayjs';

export type ParsedResumeExperience = {
  title: string;
  company: string;
  location: string;
  description: string;
  dates: [Dayjs, Dayjs?] | null;
  isCurrent: boolean;
};

export const parseResumeExperience = (text: string): ParsedResumeExperience | null => {
  if (!text || text.length < 10) return null;

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return null;

  let parsedTitle = '';
  let parsedCompany = '';
  let parsedLocation = '';
  let parsedDates = '';
  const descriptionLines: string[] = [];

  const isBullet = (str: string) =>
    str.startsWith('-') || str.startsWith('•') || str.startsWith('*');

  let i = 0;
  while (i < lines.length && !isBullet(lines[i])) {
    if (i === 0) {
      parsedTitle = lines[i];
    } else if (i === 1) {
      parsedCompany = lines[i];
    } else if (i === 2) {
      if (
        /([0-9]{2,4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(lines[i]) &&
        !lines[i].toLowerCase().includes('remote')
      ) {
        parsedDates = lines[i];
      } else {
        parsedLocation = lines[i];
      }
    } else if (i === 3) {
      if (/([0-9]{2,4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(lines[i])) {
        parsedDates = lines[i];
      } else {
        descriptionLines.push(lines[i]);
      }
    } else {
      descriptionLines.push(lines[i]);
    }
    i++;
  }

  while (i < lines.length) {
    descriptionLines.push(lines[i]);
    i++;
  }

  let dateValues: [Dayjs, Dayjs?] | undefined;
  let isCurrentVal = false;
  if (parsedDates) {
    const parts = parsedDates.split(/-|–|to/i).map((s) => s.trim());
    if (parts.length > 0) {
      const start = dayjs(parts[0]);
      if (start.isValid()) {
        if (parts.length > 1) {
          if (
            parts[1].toLowerCase().includes('present') ||
            parts[1].toLowerCase().includes('current')
          ) {
            isCurrentVal = true;
            dateValues = [start, undefined];
          } else {
            const end = dayjs(parts[1]);
            dateValues = end.isValid() ? [start, end] : [start, undefined];
          }
        } else {
          dateValues = [start, undefined];
        }
      }
    }
  }
  return {
    title: parsedTitle,
    company: parsedCompany,
    location: parsedLocation,
    description: descriptionLines.join('\n'),
    dates: dateValues ?? null,
    isCurrent: isCurrentVal,
  };
};

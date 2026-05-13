export const DEFAULT_TIMEZONE = 'America/Los_Angeles';

const intlWithTimeZones = Intl as typeof Intl & {
  supportedValuesOf?: (key: 'timeZone') => string[];
};

const isValidTimeZone = (value: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

export const normalizeTimeZone = (value?: string | null) => {
  const rawValue = (value || '').trim();
  return rawValue && isValidTimeZone(rawValue) ? rawValue : DEFAULT_TIMEZONE;
};

export const getBrowserTimeZone = () =>
  normalizeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);

export const getTimeZoneLabel = (timeZone: string) => {
  const normalized = normalizeTimeZone(timeZone);
  const name = normalized.replace(/_/g, ' ');
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone: normalized,
      timeZoneName: 'short',
    }).formatToParts(new Date());
    const shortName = parts.find((part) => part.type === 'timeZoneName')?.value;
    return shortName ? `${name} (${shortName})` : name;
  } catch {
    return name;
  }
};

const supportedTimeZones = intlWithTimeZones.supportedValuesOf?.('timeZone') ?? [
  Intl.DateTimeFormat().resolvedOptions().timeZone,
  DEFAULT_TIMEZONE,
];

export const TIMEZONE_OPTIONS = Array.from(new Set(supportedTimeZones))
  .filter(isValidTimeZone)
  .map((value) => ({ value, label: getTimeZoneLabel(value) }));

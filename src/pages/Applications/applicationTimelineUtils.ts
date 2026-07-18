const CANONICAL_STAGE_ORDER: Record<string, number> = {
  APPLIED: 0,
  OA: 10,
  SCREEN: 20,
  FINAL_ROUND: 890,
  ONSITE: 900,
  OFFER: 1000,
  REJECTED: 1010,
  GHOSTED: 1020,
  REMOVED_FROM_SHEET: 1030,
};

type TimelineSortValue = {
  key: string;
  stageOrder?: number;
  eventDate?: string | null;
};

const stageProgressionOrder = ({ key, stageOrder }: TimelineSortValue) => {
  const roundMatch = key.match(/^ROUND_(\d+)$/);
  if (roundMatch) return 30 + (Number(roundMatch[1]) - 1) * 10;
  return CANONICAL_STAGE_ORDER[key] ?? stageOrder ?? 999;
};

const eventDateOrder = (eventDate?: string | null) =>
  eventDate ? Date.parse(`${eventDate}T00:00:00Z`) : Number.POSITIVE_INFINITY;

export const compareTimelineStages = (left: TimelineSortValue, right: TimelineSortValue) => {
  const progressionDifference = stageProgressionOrder(left) - stageProgressionOrder(right);
  if (progressionDifference !== 0) return progressionDifference;

  const dateDifference = eventDateOrder(left.eventDate) - eventDateOrder(right.eventDate);
  if (dateDifference !== 0) return dateDifference;

  return left.key.localeCompare(right.key);
};

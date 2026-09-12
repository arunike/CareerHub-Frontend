// Opening an offer should not hit an undocumented endpoint every time. A price already carrying
export const isSharePriceStale = (asOf: unknown, todayIso: string): boolean => {
  if (typeof asOf !== 'string' || asOf.length < 10) return true;
  return asOf.slice(0, 10) < todayIso.slice(0, 10);
};

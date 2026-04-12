type LocationSource = {
  location?: string | null;
  office_location?: string | null;
};

const cleanLocation = (value?: string | null) => (value || '').trim();

export const getHomeLocation = (source?: LocationSource | null) => cleanLocation(source?.location);

export const getOfficeLocation = (source?: LocationSource | null) =>
  cleanLocation(source?.office_location);

export const getEffectiveTaxLocation = (source?: LocationSource | null) =>
  getHomeLocation(source) || getOfficeLocation(source);

export const getPrimaryApplicationLocation = (source?: LocationSource | null) =>
  getOfficeLocation(source) || getHomeLocation(source);

export const hasDistinctOfficeLocation = (source?: LocationSource | null) => {
  const home = getHomeLocation(source);
  const office = getOfficeLocation(source);
  return Boolean(home && office && home !== office);
};

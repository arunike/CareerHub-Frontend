import { DEFAULT_STATE_NAME_TO_ABBR } from '../pages/OfferComparison/calculations';

let cachedUsCityOptions: string[] | null = null;

type UsaCity = {
  name: string;
  state: string;
};

export const loadUsCityOptions = async () => {
  if (cachedUsCityOptions) return cachedUsCityOptions;

  const citiesModule = (await import('typed-usa-states/dist/cities.js')) as {
    usaCities?: UsaCity[];
  };
  const usaCities = citiesModule.usaCities ?? [];
  cachedUsCityOptions = Array.from(
    new Set(
      usaCities.map((city) => {
        const abbr = DEFAULT_STATE_NAME_TO_ABBR[city.state] || city.state;
        return `${city.name}, ${abbr}, United States`;
      })
    )
  );

  return cachedUsCityOptions;
};

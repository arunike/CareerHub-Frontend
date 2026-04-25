const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const readEnvString = (value: string | undefined) => {
  if (!value) return '';
  const trimmed = value.trim();
  return trimmed ? trimTrailingSlash(trimmed) : '';
};

const API_BASE_URL = readEnvString(import.meta.env.VITE_API_BASE_URL);
const MEDIA_BASE_URL = readEnvString(import.meta.env.VITE_MEDIA_BASE_URL);

export const getApiBaseUrl = () => API_BASE_URL || '/api';

const deriveMediaBaseUrl = () => {
  if (MEDIA_BASE_URL) {
    return MEDIA_BASE_URL;
  }

  if (!API_BASE_URL) {
    return '';
  }

  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return '';
  }
};

export const getMediaUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;

  try {
    return new URL(value).toString();
  } catch {
    const mediaBase = deriveMediaBaseUrl();
    if (!mediaBase) {
      return value;
    }
    return new URL(value, `${mediaBase}/`).toString();
  }
};

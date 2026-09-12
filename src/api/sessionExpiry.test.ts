import { describe, expect, it } from 'vitest';
import { isSessionRejection } from './sessionExpiry';

describe('isSessionRejection', () => {
  it('is a rejection when the server refused the refresh token', () => {
    expect(isSessionRejection({ response: { status: 401 } })).toBe(true);
    expect(isSessionRejection({ response: { status: 400 } })).toBe(true);
  });

  it('is not a rejection when the request never reached the server', () => {
    // axios reports a dropped connection with no response at all.
    expect(isSessionRejection({ code: 'ERR_NETWORK', message: 'Network Error' })).toBe(false);
    expect(isSessionRejection(new Error('timeout of 0ms exceeded'))).toBe(false);
  });

  it('is not a rejection when the server itself is broken', () => {
    // A 502 from a cold start says nothing about whether the token is still good.
    expect(isSessionRejection({ response: { status: 502 } })).toBe(false);
    expect(isSessionRejection({ response: { status: 500 } })).toBe(false);
  });

  it('does not fall over on a shape it did not expect', () => {
    expect(isSessionRejection(null)).toBe(false);
    expect(isSessionRejection(undefined)).toBe(false);
    expect(isSessionRejection({ response: {} })).toBe(false);
    expect(isSessionRejection({ response: { status: '401' } })).toBe(false);
  });
});

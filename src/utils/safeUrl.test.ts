import { describe, expect, it } from 'vitest';
import { safeExternalHref } from './safeUrl';

describe('safeExternalHref', () => {
  it('keeps an ordinary link', () => {
    expect(safeExternalHref('https://example.com/jobs/1')).toBe('https://example.com/jobs/1');
  });

  it('keeps http and mailto', () => {
    expect(safeExternalHref('http://example.com/')).toBe('http://example.com/');
    expect(safeExternalHref('mailto:someone@example.com')).toBe('mailto:someone@example.com');
  });

  it('assumes https for a bare domain, which is what people paste', () => {
    expect(safeExternalHref('example.com/careers')).toBe('https://example.com/careers');
    expect(safeExternalHref('www.example.com')).toBe('https://www.example.com');
  });

  it('drops a javascript: URL rather than rendering it', () => {
    expect(safeExternalHref('javascript:alert(1)')).toBeUndefined();
    // Casing and padding are how these get past a naive startsWith check.
    expect(safeExternalHref('  JaVaScRiPt:alert(1)')).toBeUndefined();
  });

  it('drops data: and vbscript: too', () => {
    expect(safeExternalHref('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(safeExternalHref('vbscript:msgbox(1)')).toBeUndefined();
  });

  it('drops file: so a link cannot point at the local disk', () => {
    expect(safeExternalHref('file:///etc/passwd')).toBeUndefined();
  });

  it('returns nothing for an empty value', () => {
    expect(safeExternalHref('')).toBeUndefined();
    expect(safeExternalHref(null)).toBeUndefined();
    expect(safeExternalHref(undefined)).toBeUndefined();
    expect(safeExternalHref('   ')).toBeUndefined();
  });
});

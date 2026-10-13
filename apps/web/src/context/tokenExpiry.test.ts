import { describe, expect, it } from 'vitest';
import { getTokenExpiry } from './tokenExpiry';

describe('JWT expiry decoding', () => {
  it('decodes base64url expiration without treating it as signature verification', () => {
    const payload = btoa(JSON.stringify({ exp: 123, name: 'Alex' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(getTokenExpiry(`header.${payload}.signature`)).toBe(123000);
  });

  it.each([null, 'opaque-token', 'a.!.c', `a.${btoa('{"exp":"123"}')}.c`])(
    'does not invent an expiration for %s',
    (token) => expect(getTokenExpiry(token)).toBeNull()
  );
});

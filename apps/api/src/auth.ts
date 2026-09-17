export interface ParentTokenPayload {
  sub: string; // parent ID
  role: 'parent';
  email: string;
  name: string;
  exp: number;
}

export interface ChildTokenPayload {
  sub: string; // child/player ID
  role: 'child';
  name: string;
  parentId: string;
  exp: number;
}

export type TokenPayload = ParentTokenPayload | ChildTokenPayload;

function base64UrlEncode(data: Uint8Array | string): string {
  let binary = '';
  if (typeof data === 'string') {
    const bytes = new TextEncoder().encode(data);
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
  } else {
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
  }
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

/**
 * Hash a password using standard Web Crypto PBKDF2 with SHA-256
 */
export async function hashPassword(
  password: string,
  salt?: string
): Promise<{ hash: string; salt: string }> {
  const actualSalt = salt || crypto.randomUUID().replace(/-/g, '');
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(actualSalt),
      iterations: 10000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  const hash = Array.from(new Uint8Array(derivedKey))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return { hash, salt: actualSalt };
}

/**
 * Verify a plaintext password against an existing hash and salt
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string
): Promise<boolean> {
  const result = await hashPassword(password, salt);
  return result.hash === hash;
}

/**
 * Sign a token using Web Crypto HMAC-SHA256
 */
export async function signToken(payload: TokenPayload, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const message = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const encodedSignature = base64UrlEncode(new Uint8Array(signatureBytes));
  return `${message}.${encodedSignature}`;
}

/**
 * Verify and decode an HMAC-SHA256 signed token
 */
export async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const message = `${header}.${payload}`;
  const enc = new TextEncoder();

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const binary = base64UrlDecode(signature);
    const signatureBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      signatureBytes[i] = binary.charCodeAt(i);
    }

    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, enc.encode(message));
    if (!valid) return null;

    const decoded = JSON.parse(base64UrlDecode(payload)) as TokenPayload;
    if (typeof decoded.exp === 'number') {
      const now = Math.floor(Date.now() / 1000);
      if (now > decoded.exp) {
        return null; // Expired
      }
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extract Bearer token from Request Authorization header
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

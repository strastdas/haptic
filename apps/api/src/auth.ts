import { jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';
import type { AuthUser, VerifiedHandoff } from './types';

export interface HandoffConfig {
  authAudience: string;
  authSigningSecret: string;
  authUrl: string;
}

function optionalString(payload: JWTPayload, claim: string): string | undefined {
  const value = payload[claim];
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value !== 'string') {
    throw new TypeError(`JWT claim '${claim}' must be a string`);
  }
  return value;
}

function userFromPayload(payload: JWTPayload): AuthUser {
  if (!payload.sub) {
    throw new Error("JWT claim 'sub' is required");
  }
  return {
    id: payload.sub,
    email: optionalString(payload, 'email'),
    name: optionalString(payload, 'name'),
    role: optionalString(payload, 'role')
  };
}

export async function verifyAuthHandoff(
  token: string,
  config: HandoffConfig
): Promise<VerifiedHandoff> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(config.authSigningSecret), {
    algorithms: ['HS256'],
    audience: config.authAudience,
    clockTolerance: 5,
    issuer: config.authUrl,
    requiredClaims: ['sub', 'jti', 'iat', 'exp']
  });

  if (!payload.jti || !payload.exp) {
    throw new Error("JWT claims 'jti' and 'exp' are required");
  }
  return {
    expiresAt: new Date(payload.exp * 1000),
    handoffId: payload.jti,
    user: userFromPayload(payload)
  };
}

export function buildProviderSignInUrl(
  authUrl: string,
  apiUrl: string,
  returnTo: string,
  state: string
): URL {
  const callback = new URL('/api/auth/callback', apiUrl);
  callback.searchParams.set('returnTo', returnTo);
  callback.searchParams.set('state', state);
  const signIn = new URL('/auth/sign-in', authUrl);
  signIn.searchParams.set('returnUrl', callback.toString());
  return signIn;
}

export function createOpaqueToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCodePoint(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

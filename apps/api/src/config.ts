import type { Env } from './types';

export interface Config {
  apiUrl: string;
  appOrigins: ReadonlySet<string>;
  authAudience: string;
  authSigningSecret: string;
  authUrl: string;
  databaseUrl: string;
  secureCookies: boolean;
  sessionTtlSeconds: number;
}

export function origin(value: string, label: string): string {
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.origin === 'null'
  ) {
    throw new Error(`${label} must be an HTTP(S) origin without a path, query, or hash`);
  }
  return url.origin;
}

function required(value: string | undefined, label: string): string {
  if (!value?.trim()) {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}

export function readConfig(env: Env): Config {
  const apiUrl = origin(required(env.API_URL, 'API_URL'), 'API_URL');
  const sessionTtlSeconds = Number(env.SESSION_TTL_SECONDS ?? 7 * 24 * 60 * 60);
  if (!Number.isSafeInteger(sessionTtlSeconds) || sessionTtlSeconds < 60) {
    throw new Error('SESSION_TTL_SECONDS must be an integer of at least 60');
  }

  const signingSecret = required(env.AUTH_SIGNING_SECRET, 'AUTH_SIGNING_SECRET');
  if (new TextEncoder().encode(signingSecret).byteLength < 32) {
    throw new Error('AUTH_SIGNING_SECRET must contain at least 32 bytes');
  }

  const databaseUrl = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
  return {
    apiUrl,
    appOrigins: new Set(
      required(env.APP_ORIGINS, 'APP_ORIGINS')
        .split(',')
        .map((value) => origin(value.trim(), 'APP_ORIGINS'))
    ),
    authAudience: origin(required(env.AUTH_AUDIENCE, 'AUTH_AUDIENCE'), 'AUTH_AUDIENCE'),
    authSigningSecret: signingSecret,
    authUrl: origin(required(env.AUTH_URL, 'AUTH_URL'), 'AUTH_URL'),
    databaseUrl: required(databaseUrl, 'HYPERDRIVE or DATABASE_URL'),
    secureCookies: new URL(apiUrl).protocol === 'https:',
    sessionTtlSeconds
  };
}

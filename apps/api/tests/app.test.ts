import { SignJWT } from 'jose';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import type { Config } from '../src/config';
import type { AuthRepository } from '../src/repository';

const config: Config = {
  apiUrl: 'http://localhost:8787',
  appOrigins: new Set(['http://localhost:5173', 'https://haptic.strast.dev']),
  authAudience: 'https://haptic.strast.dev',
  authSigningSecret: 'provider-secret-at-least-thirty-two-characters',
  authUrl: 'https://auth.strast.dev',
  databaseUrl: 'postgresql://unused',
  secureCookies: false,
  sessionTtlSeconds: 604_800
};

function repository(): AuthRepository {
  return {
    consumeHandoff: vi.fn(),
    findSession: vi.fn(),
    revokeSession: vi.fn()
  };
}

function handoffToken() {
  return new SignJWT({ email: 'writer@example.com', name: 'Writer' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject('user_123')
    .setIssuer(config.authUrl)
    .setAudience(config.authAudience)
    .setJti('handoff_123')
    .setIssuedAt()
    .setExpirationTime('2m')
    .sign(new TextEncoder().encode(config.authSigningSecret));
}

describe('Worker auth routes', () => {
  it('rejects an open redirect', async () => {
    const response = await createApp(
      config,
      repository()
    )(new Request('http://localhost:8787/api/auth/sign-in?returnTo=https://attacker.example'));
    expect(response.status).toBe(400);
  });

  it('binds the auth redirect to a short-lived HttpOnly state cookie', async () => {
    const response = await createApp(
      config,
      repository()
    )(
      new Request(
        'http://localhost:8787/api/auth/sign-in?returnTo=http%3A%2F%2Flocalhost%3A5173%2Fsettings'
      )
    );
    const state = response.headers.get('set-cookie')?.match(/haptic_auth_state=(?<state>[^;]+)/)
      ?.groups?.state;
    const providerUrl = new URL(response.headers.get('location') ?? 'invalid:');
    const callbackUrl = new URL(providerUrl.searchParams.get('returnUrl') ?? 'invalid:');

    expect(state).toBeTruthy();
    expect(callbackUrl.searchParams.get('state')).toBe(state);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  });

  it('consumes a handoff and creates an HttpOnly application session', async () => {
    const repo = repository();
    const token = await handoffToken();
    const response = await createApp(
      config,
      repo
    )(
      new Request(
        `http://localhost:8787/api/auth/callback?returnTo=${encodeURIComponent('http://localhost:5173/settings')}&state=state_123&token=${token}`,
        { headers: { cookie: 'haptic_auth_state=state_123' } }
      )
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://localhost:5173/settings');
    expect(response.headers.get('set-cookie')).toMatch(/haptic_session=.*HttpOnly.*SameSite=Lax/);
    expect(repo.consumeHandoff).toHaveBeenCalledOnce();
  });

  it('rejects a callback that was not initiated by this browser', async () => {
    const token = await handoffToken();
    const response = await createApp(
      config,
      repository()
    )(
      new Request(
        `http://localhost:8787/api/auth/callback?returnTo=${encodeURIComponent('http://localhost:5173')}&state=attacker_state&token=${token}`
      )
    );

    expect(response.status).toBe(400);
  });

  it('requires a valid session cookie', async () => {
    const repo = repository();
    vi.mocked(repo.findSession).mockResolvedValue({ id: 'user_123', email: 'writer@example.com' });
    const app = createApp(config, repo);

    const missingSession = await app(new Request('http://localhost:8787/api/auth/session'));
    expect(missingSession.status).toBe(401);
    const response = await app(
      new Request('http://localhost:8787/api/auth/session', {
        headers: { cookie: 'haptic_session=opaque-token' }
      })
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user: { email: 'writer@example.com', id: 'user_123' }
    });
  });

  it('accepts a bearer session for native clients', async () => {
    const repo = repository();
    vi.mocked(repo.findSession).mockResolvedValue({ id: 'user_123' });
    const response = await createApp(
      config,
      repo
    )(
      new Request('http://localhost:8787/api/auth/session', {
        headers: { authorization: 'Bearer opaque_native_token' }
      })
    );

    expect(response.status).toBe(200);
    expect(repo.findSession).toHaveBeenCalledOnce();
  });

  it('allows credentialed API requests only from configured origins', async () => {
    const app = createApp(config, repository());
    const allowed = await app(
      new Request('http://localhost:8787/api/auth/session', {
        headers: { origin: 'http://localhost:5173' }
      })
    );
    const unlisted = await app(
      new Request('http://localhost:8787/api/auth/session', {
        headers: { origin: 'https://attacker.example' }
      })
    );

    expect(allowed.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    expect(allowed.headers.get('access-control-allow-credentials')).toBe('true');
    expect(unlisted.headers.has('access-control-allow-origin')).toBe(false);
  });

  it('revokes the server-side session and expires the cookie', async () => {
    const repo = repository();
    const response = await createApp(
      config,
      repo
    )(
      new Request('http://localhost:8787/api/auth/sign-out', {
        headers: { cookie: 'haptic_session=opaque-token' },
        method: 'POST'
      })
    );
    expect(response.status).toBe(204);
    expect(repo.revokeSession).toHaveBeenCalledOnce();
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('rejects state-changing requests from an unlisted browser origin', async () => {
    const repo = repository();
    const response = await createApp(
      config,
      repo
    )(
      new Request('http://localhost:8787/api/auth/sign-out', {
        headers: {
          cookie: 'haptic_session=opaque-token',
          origin: 'https://attacker.example'
        },
        method: 'POST'
      })
    );

    expect(response.status).toBe(403);
    expect(repo.revokeSession).not.toHaveBeenCalled();
  });
});

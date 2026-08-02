import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import {
  buildProviderSignInUrl,
  createOpaqueToken,
  hashSessionToken,
  verifyAuthHandoff
} from '../src/auth';

const config = {
  authAudience: 'https://haptic.strast.dev',
  authSigningSecret: 'provider-secret-at-least-thirty-two-characters',
  authUrl: 'https://auth.strast.dev'
};

function handoffToken(overrides: { audience?: string; issuer?: string } = {}) {
  return new SignJWT({ email: 'writer@example.com', name: 'Writer', role: 'user' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject('user_123')
    .setIssuer(overrides.issuer ?? config.authUrl)
    .setAudience(overrides.audience ?? config.authAudience)
    .setJti('handoff_123')
    .setIssuedAt()
    .setExpirationTime('2m')
    .sign(new TextEncoder().encode(config.authSigningSecret));
}

describe('central auth handoff', () => {
  it('builds the provider redirect through the Worker callback', () => {
    const result = buildProviderSignInUrl(
      config.authUrl,
      'http://localhost:8787',
      'http://localhost:5173/settings',
      'state_123'
    );
    const callback = new URL(result.searchParams.get('returnUrl') ?? 'invalid:');

    expect(result.origin).toBe(config.authUrl);
    expect(result.pathname).toBe('/auth/sign-in');
    expect(callback.toString()).toBe(
      'http://localhost:8787/api/auth/callback?returnTo=http%3A%2F%2Flocalhost%3A5173%2Fsettings&state=state_123'
    );
  });

  it('accepts a correctly bound provider token', async () => {
    await expect(verifyAuthHandoff(await handoffToken(), config)).resolves.toMatchObject({
      handoffId: 'handoff_123',
      user: { email: 'writer@example.com', id: 'user_123', name: 'Writer', role: 'user' }
    });
  });

  it('rejects another audience or issuer', async () => {
    await expect(
      verifyAuthHandoff(await handoffToken({ audience: 'https://other.example' }), config)
    ).rejects.toThrow();
    await expect(
      verifyAuthHandoff(await handoffToken({ issuer: 'https://attacker.example' }), config)
    ).rejects.toThrow();
  });
});

describe('application session tokens', () => {
  it('generates random opaque tokens and stable non-plaintext hashes', async () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();
    expect(first).not.toBe(second);
    expect(await hashSessionToken(first)).toBe(await hashSessionToken(first));
    expect(await hashSessionToken(first)).not.toContain(first);
  });
});

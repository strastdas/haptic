export const SESSION_COOKIE = 'haptic_session';
export const AUTH_STATE_COOKIE = 'haptic_auth_state';

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) {
    return;
  }
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(value.join('='));
    }
  }
}

export function sessionCookie(token: string, maxAge: number, secure: boolean): string {
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    `Max-Age=${maxAge}`,
    'Path=/api',
    'SameSite=Lax',
    secure ? 'Secure' : undefined
  ]
    .filter(Boolean)
    .join('; ');
}

export function expiredSessionCookie(secure: boolean): string {
  return sessionCookie('', 0, secure);
}

export function authStateCookie(state: string, secure: boolean): string {
  return [
    `${AUTH_STATE_COOKIE}=${encodeURIComponent(state)}`,
    'HttpOnly',
    'Max-Age=300',
    'Path=/api/auth/callback',
    'SameSite=Lax',
    secure ? 'Secure' : undefined
  ]
    .filter(Boolean)
    .join('; ');
}

export function expiredAuthStateCookie(secure: boolean): string {
  return authStateCookie('', secure).replace('Max-Age=300', 'Max-Age=0');
}

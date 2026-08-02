import {
  buildProviderSignInUrl,
  createOpaqueToken,
  hashSessionToken,
  verifyAuthHandoff
} from './auth';
import {
  AUTH_STATE_COOKIE,
  authStateCookie,
  expiredAuthStateCookie,
  expiredSessionCookie,
  readCookie,
  SESSION_COOKIE,
  sessionCookie
} from './cookie';
import type { Config } from './config';
import { ReplayedHandoffError } from './errors';
import type { AuthRepository } from './repository';

type Respond = (response: Response) => Response;

function json(body: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(body, { status, headers });
}

function allowedReturnTo(value: string | null, config: Config): URL | undefined {
  if (!value) {
    return;
  }
  const url = new URL(value);
  return config.appOrigins.has(url.origin) && !url.username && !url.password ? url : undefined;
}

function withCors(request: Request, response: Response, config: Config): Response {
  const requestOrigin = request.headers.get('origin');
  if (!requestOrigin || !config.appOrigins.has(requestOrigin)) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.set('access-control-allow-credentials', 'true');
  headers.set('access-control-allow-origin', requestOrigin);
  headers.append('vary', 'Origin');
  return new Response(response.body, { headers, status: response.status });
}

async function sessionHash(request: Request): Promise<string | undefined> {
  const authorization = request.headers.get('authorization');
  const bearer = authorization?.match(/^Bearer (?<token>[A-Za-z0-9_-]+)$/)?.groups?.token;
  const token = bearer ?? readCookie(request, SESSION_COOKIE);
  if (!token) {
    return;
  }
  return await hashSessionToken(token);
}

function signIn(url: URL, config: Config, respond: Respond): Response {
  const returnTo = allowedReturnTo(url.searchParams.get('returnTo'), config);
  if (!returnTo) {
    return respond(json({ error: 'Invalid returnTo URL' }, 400));
  }
  const state = createOpaqueToken();
  return respond(
    new Response(null, {
      headers: {
        location: buildProviderSignInUrl(
          config.authUrl,
          config.apiUrl,
          returnTo.toString(),
          state
        ).toString(),
        'set-cookie': authStateCookie(state, config.secureCookies)
      },
      status: 302
    })
  );
}

function callbackError(
  message: string,
  status: number,
  config: Config,
  respond: Respond
): Response {
  return respond(
    json({ error: message }, status, {
      'set-cookie': expiredAuthStateCookie(config.secureCookies)
    })
  );
}

async function authCallback(
  request: Request,
  url: URL,
  config: Config,
  repository: AuthRepository,
  respond: Respond
): Promise<Response> {
  const returnTo = allowedReturnTo(url.searchParams.get('returnTo'), config);
  const token = url.searchParams.get('token');
  const state = url.searchParams.get('state');
  const expectedState = readCookie(request, AUTH_STATE_COOKIE);
  if (!returnTo || !token || !state || state !== expectedState) {
    return callbackError('Invalid auth callback', 400, config, respond);
  }

  let handoff;
  try {
    handoff = await verifyAuthHandoff(token, config);
  } catch {
    return callbackError('Invalid or expired auth handoff', 401, config, respond);
  }

  try {
    const sessionToken = createOpaqueToken();
    await repository.consumeHandoff(handoff, {
      expiresAt: new Date(Date.now() + config.sessionTtlSeconds * 1000),
      id: crypto.randomUUID(),
      tokenHash: await hashSessionToken(sessionToken)
    });
    const headers = new Headers({ location: returnTo.toString() });
    headers.append(
      'set-cookie',
      sessionCookie(sessionToken, config.sessionTtlSeconds, config.secureCookies)
    );
    headers.append('set-cookie', expiredAuthStateCookie(config.secureCookies));
    return respond(new Response(null, { headers, status: 302 }));
  } catch (error) {
    if (error instanceof ReplayedHandoffError) {
      return callbackError('Auth handoff already used', 401, config, respond);
    }
    throw error;
  }
}

async function readSession(
  request: Request,
  repository: AuthRepository,
  respond: Respond
): Promise<Response> {
  const tokenHash = await sessionHash(request);
  const user = tokenHash ? await repository.findSession(tokenHash) : undefined;
  return respond(user ? json({ user }) : json({ error: 'Unauthorized' }, 401));
}

async function signOut(
  request: Request,
  config: Config,
  repository: AuthRepository,
  respond: Respond
): Promise<Response> {
  const tokenHash = await sessionHash(request);
  if (tokenHash) {
    await repository.revokeSession(tokenHash);
  }
  return respond(
    new Response(null, {
      headers: { 'set-cookie': expiredSessionCookie(config.secureCookies) },
      status: 204
    })
  );
}

function preflight(requestOrigin: string | null, config: Config, respond: Respond): Response {
  if (!requestOrigin || !config.appOrigins.has(requestOrigin)) {
    return json({ error: 'Origin not allowed' }, 403);
  }
  return respond(
    new Response(null, {
      headers: {
        'access-control-allow-headers': 'Authorization, Content-Type',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-max-age': '86400'
      },
      status: 204
    })
  );
}

function route(
  request: Request,
  url: URL,
  config: Config,
  repository: AuthRepository,
  respond: Respond
): Response | Promise<Response> {
  switch (`${request.method} ${url.pathname}`) {
    case 'GET /health': {
      return respond(json({ status: 'ok' }));
    }
    case 'GET /api/auth/sign-in': {
      return signIn(url, config, respond);
    }
    case 'GET /api/auth/callback': {
      return authCallback(request, url, config, repository, respond);
    }
    case 'GET /api/auth/session': {
      return readSession(request, repository, respond);
    }
    case 'POST /api/auth/sign-out': {
      return signOut(request, config, repository, respond);
    }
    default: {
      return respond(json({ error: 'Not found' }, 404));
    }
  }
}

export function createApp(config: Config, repository: AuthRepository) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const respond = (response: Response) => withCors(request, response, config);
    const requestOrigin = request.headers.get('origin');

    if (
      request.method === 'POST' &&
      url.pathname.startsWith('/api/') &&
      requestOrigin &&
      !config.appOrigins.has(requestOrigin)
    ) {
      return json({ error: 'Origin not allowed' }, 403);
    }
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return preflight(requestOrigin, config, respond);
    }
    return await route(request, url, config, repository, respond);
  };
}

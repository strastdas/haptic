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
import { DuplicateNotePathError, ReplayedHandoffError } from './errors';
import type { AuthRepository } from './repository';
import type { AuthUser } from './types';

type Respond = (response: Response) => Response;

const COLLECTION_ID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const collectionPath = new RegExp(`^/api/sync/collections/(?<collectionId>${COLLECTION_ID})$`);
const notesPath = new RegExp(`^/api/sync/collections/(?<collectionId>${COLLECTION_ID})/notes$`);
const notePath = new RegExp(
  `^/api/sync/collections/(?<collectionId>${COLLECTION_ID})/notes/(?<noteId>${COLLECTION_ID})$`
);

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

async function authenticatedUser(
  request: Request,
  repository: AuthRepository
): Promise<AuthUser | undefined> {
  const tokenHash = await sessionHash(request);
  return tokenHash ? await repository.findSession(tokenHash) : undefined;
}

async function jsonObject(request: Request): Promise<Record<string, unknown> | undefined> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : undefined;
  } catch {
    // Invalid JSON is handled as a client input failure by the route.
  }
}

function collectionName(body: Record<string, unknown> | undefined): string | undefined {
  const name = typeof body?.name === 'string' ? body.name.trim() : undefined;
  return name && name.length <= 120 ? name : undefined;
}

function notePayload(
  body: Record<string, unknown> | undefined
): { content: string; path: string } | undefined {
  const content = typeof body?.content === 'string' ? body.content : undefined;
  const path = typeof body?.path === 'string' ? body.path : undefined;
  if (content === undefined || content.length > 2 * 1024 * 1024 || !path || path.length > 1024) {
    return;
  }
  const segments = path.split('/');
  if (
    path.startsWith('/') ||
    path.includes('\\') ||
    path.includes('\u0000') ||
    !path.endsWith('.md') ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    return;
  }
  return { content, path };
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

async function collectionsRoute(
  request: Request,
  url: URL,
  user: AuthUser,
  repository: AuthRepository,
  respond: Respond
): Promise<Response | undefined> {
  if (url.pathname === '/api/sync/collections') {
    if (request.method === 'GET') {
      return respond(json({ collections: await repository.listCloudCollections(user.id) }));
    }
    if (request.method === 'POST') {
      const name = collectionName(await jsonObject(request));
      if (!name) {
        return respond(json({ error: 'Collection name must be 1–120 characters.' }, 400));
      }
      const collection = await repository.createCloudCollection(user.id, name);
      return respond(json({ collection }, 201));
    }
  }
}

async function collectionRoute(
  request: Request,
  url: URL,
  user: AuthUser,
  repository: AuthRepository,
  respond: Respond
): Promise<Response | undefined> {
  const collectionMatch = url.pathname.match(collectionPath);
  if (collectionMatch?.groups?.collectionId) {
    const { collectionId } = collectionMatch.groups;
    if (request.method === 'GET') {
      const collection = await repository.findCloudCollection(user.id, collectionId);
      return respond(
        collection ? json({ collection }) : json({ error: 'Collection not found' }, 404)
      );
    }
    if (request.method === 'PATCH') {
      const name = collectionName(await jsonObject(request));
      if (!name) {
        return respond(json({ error: 'Collection name must be 1–120 characters.' }, 400));
      }
      const collection = await repository.renameCloudCollection(user.id, collectionId, name);
      return respond(
        collection ? json({ collection }) : json({ error: 'Collection not found' }, 404)
      );
    }
    if (request.method === 'DELETE') {
      const deleted = await repository.deleteCloudCollection(user.id, collectionId);
      return respond(
        deleted ? new Response(null, { status: 204 }) : json({ error: 'Collection not found' }, 404)
      );
    }
  }
}

async function notesRoute(
  request: Request,
  url: URL,
  user: AuthUser,
  repository: AuthRepository,
  respond: Respond
): Promise<Response | undefined> {
  const notesMatch = url.pathname.match(notesPath);
  if (notesMatch?.groups?.collectionId) {
    const { collectionId } = notesMatch.groups;
    const collection = await repository.findCloudCollection(user.id, collectionId);
    if (!collection) {
      return respond(json({ error: 'Collection not found' }, 404));
    }
    if (request.method === 'GET') {
      return respond(json({ notes: await repository.listCloudNotes(user.id, collectionId) }));
    }
    if (request.method === 'POST') {
      const note = notePayload(await jsonObject(request));
      if (!note) {
        return respond(json({ error: 'Note path or content is invalid.' }, 400));
      }
      try {
        const created = await repository.createCloudNote(user.id, collectionId, {
          ...note,
          id: crypto.randomUUID()
        });
        return respond(
          created ? json({ note: created }, 201) : json({ error: 'Collection not found' }, 404)
        );
      } catch (error) {
        if (error instanceof DuplicateNotePathError) {
          return respond(json({ error: error.message }, 409));
        }
        throw error;
      }
    }
  }
}

async function noteRoute(
  request: Request,
  url: URL,
  user: AuthUser,
  repository: AuthRepository,
  respond: Respond
): Promise<Response | undefined> {
  const noteMatch = url.pathname.match(notePath);
  if (noteMatch?.groups?.collectionId && noteMatch.groups.noteId) {
    const { collectionId, noteId } = noteMatch.groups;
    if (request.method === 'GET') {
      const note = await repository.findCloudNote(user.id, collectionId, noteId);
      return respond(note ? json({ note }) : json({ error: 'Note not found' }, 404));
    }
    if (request.method === 'PUT') {
      const note = notePayload(await jsonObject(request));
      if (!note) {
        return respond(json({ error: 'Note path or content is invalid.' }, 400));
      }
      try {
        const updated = await repository.updateCloudNote(user.id, collectionId, noteId, note);
        return respond(updated ? json({ note: updated }) : json({ error: 'Note not found' }, 404));
      } catch (error) {
        if (error instanceof DuplicateNotePathError) {
          return respond(json({ error: error.message }, 409));
        }
        throw error;
      }
    }
    if (request.method === 'DELETE') {
      const deleted = await repository.deleteCloudNote(user.id, collectionId, noteId);
      return respond(
        deleted ? new Response(null, { status: 204 }) : json({ error: 'Note not found' }, 404)
      );
    }
  }
}

async function cloudRoute(
  request: Request,
  url: URL,
  repository: AuthRepository,
  respond: Respond
): Promise<Response> {
  const user = await authenticatedUser(request, repository);
  if (!user) {
    return respond(json({ error: 'Unauthorized' }, 401));
  }

  const collectionsResponse = await collectionsRoute(request, url, user, repository, respond);
  if (collectionsResponse) {
    return collectionsResponse;
  }
  const collectionResponse = await collectionRoute(request, url, user, repository, respond);
  if (collectionResponse) {
    return collectionResponse;
  }
  const notesResponse = await notesRoute(request, url, user, repository, respond);
  if (notesResponse) {
    return notesResponse;
  }
  const noteResponse = await noteRoute(request, url, user, repository, respond);
  if (noteResponse) {
    return noteResponse;
  }
  return respond(json({ error: 'Not found' }, 404));
}

function preflight(requestOrigin: string | null, config: Config, respond: Respond): Response {
  if (!requestOrigin || !config.appOrigins.has(requestOrigin)) {
    return json({ error: 'Origin not allowed' }, 403);
  }
  return respond(
    new Response(null, {
      headers: {
        'access-control-allow-headers': 'Authorization, Content-Type',
        'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
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
  if (url.pathname.startsWith('/api/sync/')) {
    return cloudRoute(request, url, repository, respond);
  }
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
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method) &&
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

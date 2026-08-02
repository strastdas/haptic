export interface HyperdriveBinding {
  connectionString: string;
}

export interface Env {
  API_URL: string;
  APP_ORIGINS: string;
  AUTH_AUDIENCE: string;
  AUTH_SIGNING_SECRET: string;
  AUTH_URL: string;
  DATABASE_URL?: string;
  HYPERDRIVE?: HyperdriveBinding;
  SESSION_TTL_SECONDS?: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  role?: string;
}

export interface VerifiedHandoff {
  expiresAt: Date;
  handoffId: string;
  user: AuthUser;
}

/** A user-owned collection that a cloud storage adapter can materialize. */
export interface CloudCollection {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** One markdown note in a cloud collection. Paths are collection-relative. */
export interface CloudNote {
  id: string;
  path: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

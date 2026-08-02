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

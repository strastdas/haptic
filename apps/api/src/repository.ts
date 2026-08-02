import { Client } from 'pg';
import { ReplayedHandoffError } from './errors';
import type { AuthUser, VerifiedHandoff } from './types';

export interface AuthRepository {
  consumeHandoff: (
    handoff: VerifiedHandoff,
    session: { expiresAt: Date; id: string; tokenHash: string }
  ) => Promise<void>;
  findSession: (tokenHash: string) => Promise<AuthUser | undefined>;
  revokeSession: (tokenHash: string) => Promise<void>;
}

export class PgAuthRepository implements AuthRepository {
  private readonly connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  private async withClient<T>(operation: (client: Client) => Promise<T>): Promise<T> {
    const client = new Client({ connectionString: this.connectionString });
    await client.connect();
    try {
      return await operation(client);
    } finally {
      await client.end();
    }
  }

  async consumeHandoff(
    handoff: VerifiedHandoff,
    session: { expiresAt: Date; id: string; tokenHash: string }
  ): Promise<void> {
    await this.withClient(async (client) => {
      await client.query('BEGIN');
      try {
        const consumed = await client.query(
          `INSERT INTO auth_handoff (id, user_id, provider_expires_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO NOTHING
           RETURNING id`,
          [handoff.handoffId, handoff.user.id, handoff.expiresAt]
        );
        if (consumed.rowCount !== 1) {
          throw new ReplayedHandoffError('Auth handoff was already used');
        }

        await client.query(
          `INSERT INTO app_user (id, email, name, role)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET
             email = EXCLUDED.email,
             name = EXCLUDED.name,
             role = EXCLUDED.role,
             updated_at = now()`,
          [handoff.user.id, handoff.user.email, handoff.user.name, handoff.user.role]
        );
        await client.query(
          `INSERT INTO app_session (id, user_id, token_hash, expires_at)
           VALUES ($1, $2, $3, $4)`,
          [session.id, handoff.user.id, session.tokenHash, session.expiresAt]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  }

  async findSession(tokenHash: string): Promise<AuthUser | undefined> {
    return await this.withClient(async (client) => {
      const result = await client.query<{
        email: string | null;
        id: string;
        name: string | null;
        role: string | null;
      }>(
        `SELECT app_user.id, app_user.email, app_user.name, app_user.role
         FROM app_session
         JOIN app_user ON app_user.id = app_session.user_id
         WHERE app_session.token_hash = $1
           AND app_session.revoked_at IS NULL
           AND app_session.expires_at > now()`,
        [tokenHash]
      );
      const [user] = result.rows;
      if (!user) {
        return;
      }
      return {
        id: user.id,
        ...(user.email === null ? {} : { email: user.email }),
        ...(user.name === null ? {} : { name: user.name }),
        ...(user.role === null ? {} : { role: user.role })
      };
    });
  }

  async revokeSession(tokenHash: string): Promise<void> {
    await this.withClient(async (client) => {
      await client.query(
        `UPDATE app_session SET revoked_at = now()
         WHERE token_hash = $1 AND revoked_at IS NULL`,
        [tokenHash]
      );
    });
  }
}

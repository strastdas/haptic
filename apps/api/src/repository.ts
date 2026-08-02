import { Client } from 'pg';
import { DuplicateNotePathError, FolderNotEmptyError, ReplayedHandoffError } from './errors';
import type { AuthUser, CloudCollection, CloudFolder, CloudNote, VerifiedHandoff } from './types';

export interface AuthRepository {
  consumeHandoff: (
    handoff: VerifiedHandoff,
    session: { expiresAt: Date; id: string; tokenHash: string }
  ) => Promise<void>;
  findSession: (tokenHash: string) => Promise<AuthUser | undefined>;
  revokeSession: (tokenHash: string) => Promise<void>;
  listCloudCollections: (userId: string) => Promise<CloudCollection[]>;
  findCloudCollection: (
    userId: string,
    collectionId: string
  ) => Promise<CloudCollection | undefined>;
  createCloudCollection: (userId: string, name: string) => Promise<CloudCollection>;
  renameCloudCollection: (
    userId: string,
    collectionId: string,
    name: string
  ) => Promise<CloudCollection | undefined>;
  deleteCloudCollection: (userId: string, collectionId: string) => Promise<boolean>;
  listCloudNotes: (userId: string, collectionId: string) => Promise<CloudNote[]>;
  findCloudNote: (
    userId: string,
    collectionId: string,
    noteId: string
  ) => Promise<CloudNote | undefined>;
  createCloudNote: (
    userId: string,
    collectionId: string,
    note: { content: string; id: string; path: string }
  ) => Promise<CloudNote | undefined>;
  updateCloudNote: (
    userId: string,
    collectionId: string,
    noteId: string,
    note: { content: string; path: string }
  ) => Promise<CloudNote | undefined>;
  deleteCloudNote: (userId: string, collectionId: string, noteId: string) => Promise<boolean>;
  listCloudFolders: (userId: string, collectionId: string) => Promise<CloudFolder[]>;
  createCloudFolder: (
    userId: string,
    collectionId: string,
    path: string
  ) => Promise<CloudFolder | undefined>;
  updateCloudFolderPath: (
    userId: string,
    collectionId: string,
    folderId: string,
    path: string
  ) => Promise<CloudFolder | undefined>;
  deleteCloudFolder: (
    userId: string,
    collectionId: string,
    folderId: string,
    recursive: boolean
  ) => Promise<boolean>;
}

interface CloudCollectionRow {
  created_at: Date;
  id: string;
  name: string;
  updated_at: Date;
}

interface CloudNoteRow {
  content: string;
  created_at: Date;
  id: string;
  path: string;
  updated_at: Date;
}

interface CloudFolderRow {
  created_at: Date;
  id: string;
  path: string;
  updated_at: Date;
}

function cloudCollection(row: CloudCollectionRow): CloudCollection {
  return {
    createdAt: row.created_at.toISOString(),
    id: row.id,
    name: row.name,
    updatedAt: row.updated_at.toISOString()
  };
}

function cloudNote(row: CloudNoteRow): CloudNote {
  return {
    content: row.content,
    createdAt: row.created_at.toISOString(),
    id: row.id,
    path: row.path,
    updatedAt: row.updated_at.toISOString()
  };
}

function cloudFolder(row: CloudFolderRow): CloudFolder {
  return {
    createdAt: row.created_at.toISOString(),
    id: row.id,
    path: row.path,
    updatedAt: row.updated_at.toISOString()
  };
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

  async listCloudCollections(userId: string): Promise<CloudCollection[]> {
    return await this.withClient(async (client) => {
      const result = await client.query<CloudCollectionRow>(
        `SELECT id, name, created_at, updated_at
         FROM cloud_collection
         WHERE user_id = $1
         ORDER BY created_at ASC`,
        [userId]
      );
      return result.rows.map(cloudCollection);
    });
  }

  async findCloudCollection(
    userId: string,
    collectionId: string
  ): Promise<CloudCollection | undefined> {
    return await this.withClient(async (client) => {
      const result = await client.query<CloudCollectionRow>(
        `SELECT id, name, created_at, updated_at
         FROM cloud_collection
         WHERE id = $1 AND user_id = $2`,
        [collectionId, userId]
      );
      const [collection] = result.rows;
      return collection ? cloudCollection(collection) : undefined;
    });
  }

  async createCloudCollection(userId: string, name: string): Promise<CloudCollection> {
    return await this.withClient(async (client) => {
      const result = await client.query<CloudCollectionRow>(
        `INSERT INTO cloud_collection (id, user_id, name)
         VALUES ($1, $2, $3)
         RETURNING id, name, created_at, updated_at`,
        [crypto.randomUUID(), userId, name]
      );
      return cloudCollection(result.rows[0]);
    });
  }

  async renameCloudCollection(
    userId: string,
    collectionId: string,
    name: string
  ): Promise<CloudCollection | undefined> {
    return await this.withClient(async (client) => {
      const result = await client.query<CloudCollectionRow>(
        `UPDATE cloud_collection
         SET name = $3, updated_at = now()
         WHERE id = $1 AND user_id = $2
         RETURNING id, name, created_at, updated_at`,
        [collectionId, userId, name]
      );
      const [collection] = result.rows;
      return collection ? cloudCollection(collection) : undefined;
    });
  }

  async deleteCloudCollection(userId: string, collectionId: string): Promise<boolean> {
    return await this.withClient(async (client) => {
      const result = await client.query(
        `DELETE FROM cloud_collection WHERE id = $1 AND user_id = $2`,
        [collectionId, userId]
      );
      return result.rowCount === 1;
    });
  }

  async listCloudNotes(userId: string, collectionId: string): Promise<CloudNote[]> {
    return await this.withClient(async (client) => {
      const result = await client.query<CloudNoteRow>(
        `SELECT cloud_note.id, cloud_note.path, cloud_note.content,
                cloud_note.created_at, cloud_note.updated_at
         FROM cloud_note
         JOIN cloud_collection ON cloud_collection.id = cloud_note.collection_id
         WHERE cloud_note.collection_id = $1 AND cloud_collection.user_id = $2
         ORDER BY cloud_note.path ASC`,
        [collectionId, userId]
      );
      return result.rows.map(cloudNote);
    });
  }

  async findCloudNote(
    userId: string,
    collectionId: string,
    noteId: string
  ): Promise<CloudNote | undefined> {
    return await this.withClient(async (client) => {
      const result = await client.query<CloudNoteRow>(
        `SELECT cloud_note.id, cloud_note.path, cloud_note.content,
                cloud_note.created_at, cloud_note.updated_at
         FROM cloud_note
         JOIN cloud_collection ON cloud_collection.id = cloud_note.collection_id
         WHERE cloud_note.id = $1
           AND cloud_note.collection_id = $2
           AND cloud_collection.user_id = $3`,
        [noteId, collectionId, userId]
      );
      const [note] = result.rows;
      return note ? cloudNote(note) : undefined;
    });
  }

  async createCloudNote(
    userId: string,
    collectionId: string,
    note: { content: string; id: string; path: string }
  ): Promise<CloudNote | undefined> {
    try {
      return await this.withClient(async (client) => {
        const result = await client.query<CloudNoteRow>(
          `INSERT INTO cloud_note (id, collection_id, path, content)
           SELECT $1, $2, $3, $4
           WHERE EXISTS (
             SELECT 1 FROM cloud_collection WHERE id = $2 AND user_id = $5
           )
           RETURNING id, path, content, created_at, updated_at`,
          [note.id, collectionId, note.path, note.content, userId]
        );
        const [created] = result.rows;
        return created ? cloudNote(created) : undefined;
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new DuplicateNotePathError('A note already exists at that path.');
      }
      throw error;
    }
  }

  async updateCloudNote(
    userId: string,
    collectionId: string,
    noteId: string,
    note: { content: string; path: string }
  ): Promise<CloudNote | undefined> {
    try {
      return await this.withClient(async (client) => {
        const result = await client.query<CloudNoteRow>(
          `UPDATE cloud_note
           SET path = $4, content = $5, updated_at = now()
           WHERE id = $1
             AND collection_id = $2
             AND EXISTS (
               SELECT 1 FROM cloud_collection WHERE id = $2 AND user_id = $3
             )
           RETURNING id, path, content, created_at, updated_at`,
          [noteId, collectionId, userId, note.path, note.content]
        );
        const [updated] = result.rows;
        return updated ? cloudNote(updated) : undefined;
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new DuplicateNotePathError('A note already exists at that path.');
      }
      throw error;
    }
  }

  async deleteCloudNote(userId: string, collectionId: string, noteId: string): Promise<boolean> {
    return await this.withClient(async (client) => {
      const result = await client.query(
        `DELETE FROM cloud_note
         WHERE id = $1
           AND collection_id = $2
           AND EXISTS (
             SELECT 1 FROM cloud_collection WHERE id = $2 AND user_id = $3
           )`,
        [noteId, collectionId, userId]
      );
      return result.rowCount === 1;
    });
  }

  async listCloudFolders(userId: string, collectionId: string): Promise<CloudFolder[]> {
    return await this.withClient(async (client) => {
      const result = await client.query<CloudFolderRow>(
        `SELECT cloud_folder.id, cloud_folder.path, cloud_folder.created_at, cloud_folder.updated_at
         FROM cloud_folder
         JOIN cloud_collection ON cloud_collection.id = cloud_folder.collection_id
         WHERE cloud_folder.collection_id = $1 AND cloud_collection.user_id = $2
         ORDER BY cloud_folder.path ASC`,
        [collectionId, userId]
      );
      return result.rows.map(cloudFolder);
    });
  }

  async createCloudFolder(
    userId: string,
    collectionId: string,
    path: string
  ): Promise<CloudFolder | undefined> {
    try {
      return await this.withClient(async (client) => {
        const result = await client.query<CloudFolderRow>(
          `INSERT INTO cloud_folder (id, collection_id, path)
           SELECT $1, $2, $3
           WHERE EXISTS (
             SELECT 1 FROM cloud_collection WHERE id = $2 AND user_id = $4
           )
           RETURNING id, path, created_at, updated_at`,
          [crypto.randomUUID(), collectionId, path, userId]
        );
        const [created] = result.rows;
        return created ? cloudFolder(created) : undefined;
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new DuplicateNotePathError('An entry already exists at that path.');
      }
      throw error;
    }
  }

  async updateCloudFolderPath(
    userId: string,
    collectionId: string,
    folderId: string,
    path: string
  ): Promise<CloudFolder | undefined> {
    try {
      return await this.withClient(async (client) => {
        await client.query('BEGIN');
        try {
          const currentResult = await client.query<{ path: string }>(
            `SELECT cloud_folder.path
             FROM cloud_folder
             JOIN cloud_collection ON cloud_collection.id = cloud_folder.collection_id
             WHERE cloud_folder.id = $1
               AND cloud_folder.collection_id = $2
               AND cloud_collection.user_id = $3
             FOR UPDATE`,
            [folderId, collectionId, userId]
          );
          const [current] = currentResult.rows;
          if (!current) {
            await client.query('COMMIT');
            return;
          }
          if (path.startsWith(`${current.path}/`)) {
            throw new Error('A folder cannot be moved into itself.');
          }
          const suffixStart = current.path.length + 1;
          await client.query(
            `UPDATE cloud_note
             SET path = $1 || substring(path FROM $2), updated_at = now()
             WHERE collection_id = $3 AND path LIKE $4`,
            [path, suffixStart, collectionId, `${current.path}/%`]
          );
          const result = await client.query<CloudFolderRow>(
            `UPDATE cloud_folder
             SET path = $1 || substring(path FROM $2), updated_at = now()
             WHERE collection_id = $3 AND (path = $4 OR path LIKE $5)
             RETURNING id, path, created_at, updated_at`,
            [path, suffixStart, collectionId, current.path, `${current.path}/%`]
          );
          await client.query('COMMIT');
          const updated = result.rows.find((folder) => folder.id === folderId);
          return updated ? cloudFolder(updated) : undefined;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new DuplicateNotePathError('An entry already exists at that path.');
      }
      throw error;
    }
  }

  async deleteCloudFolder(
    userId: string,
    collectionId: string,
    folderId: string,
    recursive: boolean
  ): Promise<boolean> {
    return await this.withClient(async (client) => {
      await client.query('BEGIN');
      try {
        const currentResult = await client.query<{ path: string }>(
          `SELECT cloud_folder.path
           FROM cloud_folder
           JOIN cloud_collection ON cloud_collection.id = cloud_folder.collection_id
           WHERE cloud_folder.id = $1
             AND cloud_folder.collection_id = $2
             AND cloud_collection.user_id = $3
           FOR UPDATE`,
          [folderId, collectionId, userId]
        );
        const [current] = currentResult.rows;
        if (!current) {
          await client.query('COMMIT');
          return false;
        }
        const descendantPath = `${current.path}/%`;
        if (!recursive) {
          const descendants = await client.query(
            `SELECT 1
             FROM cloud_folder
             WHERE collection_id = $1 AND path LIKE $2
             UNION ALL
             SELECT 1 FROM cloud_note
             WHERE collection_id = $1 AND path LIKE $2
             LIMIT 1`,
            [collectionId, descendantPath]
          );
          if (descendants.rowCount) {
            throw new FolderNotEmptyError('Folder is not empty.');
          }
        }
        if (recursive) {
          await client.query(`DELETE FROM cloud_note WHERE collection_id = $1 AND path LIKE $2`, [
            collectionId,
            descendantPath
          ]);
          await client.query(`DELETE FROM cloud_folder WHERE collection_id = $1 AND path LIKE $2`, [
            collectionId,
            descendantPath
          ]);
        }
        await client.query(`DELETE FROM cloud_folder WHERE id = $1`, [folderId]);
        await client.query('COMMIT');
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  }
}

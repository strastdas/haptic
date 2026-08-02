import { createApp } from './app';
import { readConfig } from './config';
import { PgAuthRepository } from './repository';
import type { Env } from './types';

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const config = readConfig(env);
    return createApp(config, new PgAuthRepository(config.databaseUrl))(request);
  }
} satisfies ExportedHandler<Env>;

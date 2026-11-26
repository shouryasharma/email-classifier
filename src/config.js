import dotenv from 'dotenv';
import { join } from 'node:path';

dotenv.config({ path: '.env.local' });

export const config = {
  port: Number(process.env.PORT || 3000),
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-6-astra',
  emailIngestApiKey: process.env.EMAIL_INGEST_API_KEY,
  graphClientState: process.env.GRAPH_CLIENT_STATE,
  sqliteDatabasePath: process.env.SQLITE_DATABASE_PATH || join(process.cwd(), 'data', 'classifications.db'),
};

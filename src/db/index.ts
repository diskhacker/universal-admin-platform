import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "../config/env.js";
import * as schema from "./schema.js";

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    _client = postgres(getEnv().DATABASE_URL, { max: 20 });
    _db = drizzle(_client, { schema });
  }
  return _db;
}

export async function disconnectDb() {
  if (_client) {
    await _client.end();
    _client = null;
    _db = null;
  }
}

export type Db = ReturnType<typeof getDb>;

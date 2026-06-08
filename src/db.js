import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export function createDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('text', 'image')),
      text_content TEXT,
      file_path TEXT,
      mime_type TEXT,
      byte_size INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
  `);
  return db;
}

import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const EXTENSIONS_BY_MIME = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/gif', '.gif'],
  ['image/webp', '.webp']
]);

export function createStore({ db, uploadDir, retentionLimit = 100 }) {
  async function listItems() {
    return db
      .prepare(
        `SELECT rowid, id, kind, text_content, file_path, mime_type, byte_size, created_at
         FROM items
         ORDER BY datetime(created_at) DESC, rowid DESC`
      )
      .all()
      .map(toItem);
  }

  async function createTextItem(textContent) {
    const item = {
      id: randomUUID(),
      kind: 'text',
      textContent,
      filePath: null,
      mimeType: null,
      byteSize: Buffer.byteLength(textContent, 'utf8'),
      createdAt: new Date().toISOString()
    };

    db.prepare(
      `INSERT INTO items (id, kind, text_content, file_path, mime_type, byte_size, created_at)
       VALUES (@id, @kind, @textContent, @filePath, @mimeType, @byteSize, @createdAt)`
    ).run(item);

    await enforceRetention();
    return item;
  }

  async function createImageItem({ buffer, originalName, mimeType }) {
    await fs.mkdir(uploadDir, { recursive: true });
    const id = randomUUID();
    const extension = EXTENSIONS_BY_MIME.get(mimeType) || path.extname(originalName) || '.img';
    const filePath = path.join(uploadDir, `${id}${extension}`);
    await fs.writeFile(filePath, buffer);

    const item = {
      id,
      kind: 'image',
      textContent: null,
      filePath,
      mimeType,
      byteSize: buffer.length,
      createdAt: new Date().toISOString()
    };

    db.prepare(
      `INSERT INTO items (id, kind, text_content, file_path, mime_type, byte_size, created_at)
       VALUES (@id, @kind, @textContent, @filePath, @mimeType, @byteSize, @createdAt)`
    ).run(item);

    await enforceRetention();
    return item;
  }

  async function getItem(id) {
    const row = db
      .prepare(
        `SELECT rowid, id, kind, text_content, file_path, mime_type, byte_size, created_at
         FROM items
         WHERE id = ?`
      )
      .get(id);
    return row ? toItem(row) : null;
  }

  async function deleteItem(id) {
    const item = await getItem(id);
    if (!item) return false;

    db.prepare('DELETE FROM items WHERE id = ?').run(id);
    await removeFile(item.filePath);
    return true;
  }

  async function enforceRetention() {
    const expired = db
      .prepare(
        `SELECT id, file_path
         FROM items
         WHERE rowid NOT IN (
           SELECT rowid FROM items ORDER BY datetime(created_at) DESC, rowid DESC LIMIT ?
         )`
      )
      .all(retentionLimit);

    if (expired.length === 0) return;

    const deleteExpired = db.prepare(
      `DELETE FROM items
       WHERE rowid NOT IN (
         SELECT rowid FROM items ORDER BY datetime(created_at) DESC, rowid DESC LIMIT ?
       )`
    );
    deleteExpired.run(retentionLimit);

    await Promise.all(expired.map((item) => removeFile(item.file_path)));
  }

  return {
    listItems,
    createTextItem,
    createImageItem,
    getItem,
    deleteItem
  };
}

function toItem(row) {
  return {
    id: row.id,
    kind: row.kind,
    textContent: row.text_content,
    filePath: row.file_path,
    fileUrl: row.kind === 'image' ? `/api/items/${row.id}/file` : null,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    createdAt: row.created_at
  };
}

async function removeFile(filePath) {
  if (!filePath) return;
  await fs.rm(filePath, { force: true });
}

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createDatabase } from '../src/db.js';
import { createStore } from '../src/store.js';

let tmpDir;
let store;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clipflan-store-'));
  const db = createDatabase(path.join(tmpDir, 'test.sqlite'));
  store = createStore({
    db,
    uploadDir: path.join(tmpDir, 'uploads'),
    retentionLimit: 100
  });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('store', () => {
  test('creates and lists text items newest first', async () => {
    const first = await store.createTextItem('first paste');
    const second = await store.createTextItem('second paste');

    const items = await store.listItems();

    expect(items.map((item) => item.id)).toEqual([second.id, first.id]);
    expect(items[0]).toMatchObject({
      kind: 'text',
      textContent: 'second paste',
      fileUrl: null
    });
  });

  test('stores image items on disk with metadata', async () => {
    const item = await store.createImageItem({
      buffer: Buffer.from('fake image bytes'),
      originalName: 'sample.png',
      mimeType: 'image/png'
    });

    const storedBytes = await fs.readFile(item.filePath);

    expect(storedBytes.toString()).toBe('fake image bytes');
    expect(item).toMatchObject({
      kind: 'image',
      mimeType: 'image/png',
      byteSize: 16,
      textContent: null
    });
    expect(item.filePath).toContain(path.join(tmpDir, 'uploads'));
  });

  test('keeps only the newest 100 items and removes old image files', async () => {
    const oldImage = await store.createImageItem({
      buffer: Buffer.from('old'),
      originalName: 'old.png',
      mimeType: 'image/png'
    });

    for (let index = 0; index < 100; index += 1) {
      await store.createTextItem(`paste ${index}`);
    }

    const items = await store.listItems();

    await expect(fs.access(oldImage.filePath)).rejects.toThrow();
    expect(items).toHaveLength(100);
    expect(items.at(-1).textContent).toBe('paste 0');
    expect(items.some((item) => item.id === oldImage.id)).toBe(false);
  });

  test('deletes item metadata and stored image file', async () => {
    const item = await store.createImageItem({
      buffer: Buffer.from('temporary'),
      originalName: 'temporary.webp',
      mimeType: 'image/webp'
    });

    const deleted = await store.deleteItem(item.id);
    const items = await store.listItems();

    expect(deleted).toBe(true);
    expect(items).toEqual([]);
    await expect(fs.access(item.filePath)).rejects.toThrow();
  });
});

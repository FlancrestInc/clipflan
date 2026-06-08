import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createApp } from '../src/app.js';

let tmpDir;
let app;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clipflan-api-'));
  app = createApp({
    dbPath: path.join(tmpDir, 'test.sqlite'),
    uploadDir: path.join(tmpDir, 'uploads'),
    maxImageBytes: 1024,
    allowedImageTypes: new Set(['image/png', 'image/webp'])
  });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('api', () => {
  test('creates text items and lists them newest first', async () => {
    await request(app).post('/api/items/text').send({ text: 'first' }).expect(201);
    const created = await request(app)
      .post('/api/items/text')
      .send({ text: 'second' })
      .expect(201);

    const listed = await request(app).get('/api/items').expect(200);

    expect(created.body.item).toMatchObject({ kind: 'text', textContent: 'second' });
    expect(listed.body.items.map((item) => item.textContent)).toEqual(['second', 'first']);
  });

  test('rejects empty text', async () => {
    const response = await request(app)
      .post('/api/items/text')
      .send({ text: '   ' })
      .expect(400);

    expect(response.body.error.code).toBe('invalid_text');
  });

  test('uploads and returns image items', async () => {
    const upload = await request(app)
      .post('/api/items/image')
      .attach('image', Buffer.from('png bytes'), {
        filename: 'paste.png',
        contentType: 'image/png'
      })
      .expect(201);

    const file = await request(app).get(`/api/items/${upload.body.item.id}/file`).expect(200);

    expect(upload.body.item).toMatchObject({
      kind: 'image',
      mimeType: 'image/png',
      byteSize: 9
    });
    expect(file.headers['content-type']).toContain('image/png');
    expect(file.body.toString()).toBe('png bytes');
  });

  test('rejects unsupported image types', async () => {
    const response = await request(app)
      .post('/api/items/image')
      .attach('image', Buffer.from('<svg />'), {
        filename: 'paste.svg',
        contentType: 'image/svg+xml'
      })
      .expect(400);

    expect(response.body.error.code).toBe('invalid_image_type');
  });

  test('deletes items', async () => {
    const created = await request(app)
      .post('/api/items/text')
      .send({ text: 'delete me' })
      .expect(201);

    await request(app).delete(`/api/items/${created.body.item.id}`).expect(204);
    const listed = await request(app).get('/api/items').expect(200);

    expect(listed.body.items).toEqual([]);
  });

  test('returns 404 for missing image files', async () => {
    await request(app).get('/api/items/missing/file').expect(404);
  });
});

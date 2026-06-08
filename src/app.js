import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { createDatabase } from './db.js';
import { createStore } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

export function createApp(options = {}) {
  const settings = {
    dbPath: options.dbPath || config.dbPath,
    uploadDir: options.uploadDir || config.uploadDir,
    maxImageBytes: options.maxImageBytes || config.maxImageBytes,
    allowedImageTypes: options.allowedImageTypes || config.allowedImageTypes
  };

  const db = createDatabase(settings.dbPath);
  const store = createStore({
    db,
    uploadDir: settings.uploadDir,
    retentionLimit: 100
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: settings.maxImageBytes }
  });
  const app = express();

  app.locals.db = db;
  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(publicDir));

  app.get('/api/items', async (_req, res, next) => {
    try {
      res.json({ items: await store.listItems() });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/items/text', async (req, res, next) => {
    try {
      const text = typeof req.body?.text === 'string' ? req.body.text : '';
      if (text.trim().length === 0) {
        return res.status(400).json(errorResponse('invalid_text', 'Text content is required.'));
      }

      const item = await store.createTextItem(text);
      return res.status(201).json({ item });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/items/image', upload.single('image'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json(errorResponse('missing_image', 'Image file is required.'));
      }

      if (!settings.allowedImageTypes.has(req.file.mimetype)) {
        return res
          .status(400)
          .json(errorResponse('invalid_image_type', 'Only PNG, JPEG, GIF, and WebP images are supported.'));
      }

      const item = await store.createImageItem({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype
      });
      return res.status(201).json({ item });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/items/:id/file', async (req, res, next) => {
    try {
      const item = await store.getItem(req.params.id);
      if (!item || item.kind !== 'image') {
        return res.status(404).json(errorResponse('not_found', 'Image item was not found.'));
      }

      return res.type(item.mimeType).sendFile(item.filePath);
    } catch (error) {
      return next(error);
    }
  });

  app.delete('/api/items/:id', async (req, res, next) => {
    try {
      const deleted = await store.deleteItem(req.params.id);
      if (!deleted) {
        return res.status(404).json(errorResponse('not_found', 'Item was not found.'));
      }
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json(errorResponse('image_too_large', 'Image is larger than the configured limit.'));
    }

    console.error(error);
    return res.status(500).json(errorResponse('server_error', 'Clipflan could not complete the request.'));
  });

  return app;
}

function errorResponse(code, message) {
  return { error: { code, message } };
}

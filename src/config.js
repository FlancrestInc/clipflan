import path from 'node:path';

const rootDir = process.cwd();
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(rootDir, 'data');

export const config = {
  port: Number(process.env.PORT || 3000),
  dataDir,
  dbPath: process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(dataDir, 'clipflan.sqlite'),
  uploadDir: process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(dataDir, 'uploads'),
  maxImageBytes: Number(process.env.MAX_IMAGE_BYTES || 10 * 1024 * 1024),
  allowedImageTypes: new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
};

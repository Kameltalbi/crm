import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

/**
 * Absolute path to backend/uploads, independent of process.cwd() (PM2 / systemd).
 * Compiled layout: backend/dist/lib/uploadsDir.js -> ../../uploads = backend/uploads
 */
export function getUploadsDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

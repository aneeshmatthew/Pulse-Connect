import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { requireAuthHeader, AuthedRequest } from '../lib/authMiddleware';

// ─────────────────────────────────────────────────────────────────────────
// NOTE — local disk storage only works for the standalone dev/self-hosted
// server (`backend/src/index.ts`, e.g. `npm run dev` or `node dist/index.js`
// on a normal long-lived host/container).
//
// It will NOT work on the Vercel serverless deployment (backend/api/).
// Serverless function instances have an ephemeral, per-invocation
// filesystem with no shared or persistent volume across invocations or
// regions — a file written by one invocation is not guaranteed to still
// exist (or be visible) on the next request that tries to serve it. For a
// production deploy on Vercel, swap this route for a real object-storage
// provider (S3, Cloudinary, Vercel Blob, R2, etc.), typically via signed
// upload URLs so the browser uploads directly to the bucket. See the "Known
// Gaps" section of the README for details.
// ─────────────────────────────────────────────────────────────────────────

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE_MB = 25;
const ALLOWED_MIME_PREFIXES = ['image/', 'video/'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : '';
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ALLOWED_MIME_PREFIXES.some((p) => file.mimetype.startsWith(p));
    if (!allowed) return cb(new Error('Only image and video files are allowed'));
    cb(null, true);
  },
});

function mediaTypeFor(mimetype: string): 'IMAGE' | 'VIDEO' | 'GIF' {
  if (mimetype === 'image/gif') return 'GIF';
  if (mimetype.startsWith('video/')) return 'VIDEO';
  return 'IMAGE';
}

export const uploadRouter = Router();

uploadRouter.post(
  '/upload',
  requireAuthHeader,
  (req: AuthedRequest, res: Response) => {
    upload.single('file')(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        return res.status(400).json({ error: message });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
      const url = `${protocol}://${req.get('host')}/uploads/${req.file.filename}`;

      res.json({
        url,
        type: mediaTypeFor(req.file.mimetype),
        filename: req.file.filename,
        size: req.file.size,
      });
    });
  }
);

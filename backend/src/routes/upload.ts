import { Router, Response } from 'express';
import { requireAuthHeader, AuthedRequest } from '../lib/authMiddleware';
import { cloudinary, cloudinaryConfigured } from '../config/cloudinary';

// ─────────────────────────────────────────────────────────────────────────
// Media uploads go straight from the browser to Cloudinary — this backend
// never receives or stores the file bytes at all, which is why this works
// unchanged whether you're running the standalone dev server or deployed on
// Vercel serverless (there's no local disk in the picture to lose files
// between invocations, unlike the old multer-based version of this route).
//
// Flow:
//   1. Client asks this route for a signature (proves they're logged in).
//   2. Client POSTs the actual file directly to Cloudinary's API using
//      that signature — see frontend/src/utils/index.ts's uploadMedia().
//   3. Cloudinary returns a permanent URL; the client sends that URL to
//      createPost/createStory. This server only ever sees a URL string.
//
// Validation note: file type/size checks in the frontend composer
// (CreatePost.tsx) are just a fast-fail UX nicety — they run in the
// browser, so anyone could skip them and call Cloudinary directly with a
// signature obtained from this route. ALLOWED_FORMATS and MAX_FILE_SIZE
// below are included as *signed* parameters, which Cloudinary itself
// enforces server-side: tampering with either value on the client
// invalidates the signature, so this is real server-side validation, not
// just client-side politeness duplicated in two places.
// ─────────────────────────────────────────────────────────────────────────

const ALLOWED_FORMATS = 'jpg,jpeg,png,gif,webp,mp4,mov,webm';
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB — matches the frontend's own limit

export const uploadRouter = Router();

uploadRouter.post('/upload/signature', requireAuthHeader, (req: AuthedRequest, res: Response) => {
  if (!cloudinaryConfigured) {
    return res.status(503).json({
      error: 'Media upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, ' +
        'and CLOUDINARY_API_SECRET in the backend environment.',
    });
  }

  const timestamp = Math.round(Date.now() / 1000);
  // Scope uploads under a per-user folder — purely organizational (helps
  // browsing the Cloudinary media library), not an access-control boundary.
  const folder = `pulse-connect/${req.userId}`;

  // Every param the client will actually send to Cloudinary must be part
  // of the signature, or Cloudinary rejects the request as tampered.
  const paramsToSign = {
    timestamp,
    folder,
    allowed_formats: ALLOWED_FORMATS,
    max_file_size: MAX_FILE_SIZE_BYTES,
  };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  res.json({
    signature,
    timestamp,
    folder,
    allowedFormats: ALLOWED_FORMATS,
    maxFileSize: MAX_FILE_SIZE_BYTES,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
});


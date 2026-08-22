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
// ─────────────────────────────────────────────────────────────────────────

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

  // Only params actually sent to Cloudinary's upload API need to be part of
  // the signature (excludes file, api_key, cloud_name — those aren't signed).
  const paramsToSign = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  res.json({
    signature,
    timestamp,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
});

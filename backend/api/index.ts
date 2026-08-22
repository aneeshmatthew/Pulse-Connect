import type { IncomingMessage, ServerResponse } from 'http';
import { getApp } from './_app';

// Single, statically-named Vercel serverless function. Every request under
// /api/* (and, via the rewrites below, /graphql + /health too) is routed
// here — see vercel.json's "/api/:path*" rewrite for why this file isn't
// named "[...path].ts" anymore.
//
// Multi-segment catch-all note: Vercel's bracket-filename catch-all
// convention (e.g. api/[...path].ts) only reliably matches SINGLE path
// segments for plain Node.js serverless functions (i.e. projects not using
// the Next.js framework) — this is a documented Vercel platform behavior,
// not a bug in this code. That's exactly why /api/health (one segment)
// used to work while /api/upload/signature (two segments) 404'd before
// ever reaching this file. Routing every /api/* request here via an
// explicit rewrite (rather than relying on the filename convention) is
// the fix Vercel's own team recommends for this case.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp();
    app(req as any, res as any);
  } catch (err) {
    console.error('❌ Failed to initialize app:', err);

    // If getApp() throws, Express (and its cors() middleware) never ran —
    // so a plain error response here has NO Access-Control-Allow-Origin
    // header at all. The browser then reports this as a CORS failure
    // ("No 'Access-Control-Allow-Origin' header is present"), which hides
    // the real problem (a server crash — bad env var, missing dependency,
    // DB connection failure, etc.) behind a misleading error. Set a
    // permissive CORS header here specifically so the actual error
    // message reaches the browser's network tab instead of being masked.
    // This only fires on server-startup failure, never on a normal
    // response, so it doesn't weaken CORS for anything that actually works.
    const origin = req.headers?.origin;
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Server failed to start. Check environment variables and Vercel function logs.',
      detail: err instanceof Error ? err.message : String(err),
    }));
  }
}

import type { IncomingMessage, ServerResponse } from 'http';
import { getApp } from './_app';

// Catch-all Vercel serverless function: every request under /api/* (and,
// via the rewrites in vercel.json, /graphql + /health too) is routed
// through the same Express + Apollo Server instance.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp();
    app(req as any, res as any);
  } catch (err) {
    console.error('❌ Failed to initialize app:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Server failed to start. Check environment variables and logs.' }));
  }
}

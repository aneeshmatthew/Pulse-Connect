import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Same verification logic as graphql/context.ts's verifyToken, but exposed
// as plain Express middleware for REST routes (e.g. file upload) that sit
// outside the GraphQL context and don't get `{ user }` for free.
export interface AuthedRequest extends Request {
  userId?: string;
}

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
}

export function requireAuthHeader(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7).trim();
  try {
    const decoded = jwt.verify(token, jwtSecret()) as { userId: string };
    req.userId = decoded.userId;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

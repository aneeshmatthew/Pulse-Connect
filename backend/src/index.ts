import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { makeExecutableSchema } from '@graphql-tools/schema';
import connectDB from './config/database';
import { typeDefs } from './graphql/typedefs';
import { resolvers } from './graphql/resolvers';
import { createContext, createWsContext } from './graphql/context';
import { uploadRouter } from './routes/upload';
import path from 'path';

const PORT = parseInt(process.env.PORT ?? '4000', 10);
const isDev = process.env.NODE_ENV !== 'production';

// Validate required env vars up front — fail fast, fail clear
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET'] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

async function bootstrap() {
  await connectDB();

  const app = express();
  const httpServer = http.createServer(app);
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // ── WebSocket server (subscriptions) ──────────────────────────────────────
  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });

  const serverCleanup = useServer(
    {
      schema,
      context: createWsContext,
      onConnect: async (ctx: any) => {
        if (isDev) console.log('🔌 WS connected');
        return true;
      },
      onDisconnect: () => {
        if (isDev) console.log('🔌 WS disconnected');
      },
      onError: (ctx: any, msg: any, errors: any) => {
        console.error('[WS subscription error]', errors);
      },
    },
    wsServer
  );

  // ── Apollo Server ─────────────────────────────────────────────────────────
  const apolloServer = new ApolloServer({
    schema,
    introspection: isDev, // disable introspection in production
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      !isDev ? ApolloServerPluginLandingPageDisabled() : {},
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
    formatError: (formattedError, error) => {
      // Don't leak internal error details in production
      if (!isDev) {
        const code = formattedError.extensions?.code;
        const safeErrors = ['UNAUTHENTICATED', 'FORBIDDEN', 'BAD_USER_INPUT', 'NOT_FOUND'];
        if (!safeErrors.includes(code as string)) {
          return { message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } };
        }
      }
      if (isDev) console.error('[GraphQL Error]', formattedError.message);
      return formattedError;
    },
  });

  await apolloServer.start();

  // ── Express middleware ─────────────────────────────────────────────────────
  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map(s => s.trim());

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // Allow all localhost origins in development for local static serve + Vite dev.
      if (isDev && origin.startsWith('http://localhost:')) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  }));

  // Tighter body size limits — 50mb was far too permissive
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  app.use(
    '/graphql',
    expressMiddleware(apolloServer, { context: createContext })
  );

  // ── Media upload (local disk — dev/self-hosted only, see routes/upload.ts) ─
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  app.use('/api', uploadRouter);

  // ── Health & readiness probes ─────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
  });

  // ── Global error handler (catches unhandled sync Express errors) ──────────
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Express error]', err.message);
    res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
  });

  // ── Unhandled rejection safety net ───────────────────────────────────────
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Promise Rejection:', reason);
    // Don't exit — log and continue
  });

  httpServer.listen(PORT, () => {
    console.log(`\n🚀 GraphQL ready   → http://localhost:${PORT}/graphql`);
    console.log(`🔌 Subscriptions   → ws://localhost:${PORT}/graphql`);
    console.log(`💚 Health check    → http://localhost:${PORT}/health`);
    console.log(`🌍 Environment     → ${process.env.NODE_ENV ?? 'development'}\n`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

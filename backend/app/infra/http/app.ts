import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { LogController } from 'fastify';
import mercurius from 'mercurius';
import { ZodError } from 'zod';
import { DomainError } from '../../domain/errors/domain.error.js';
import { AvatarCleanupWorker } from '../avatar/avatarCleanupWorker.js';
import type { Application } from '../composition.js';
import type { Environment } from '../config/environment.js';
import { EmailWorker } from '../email/emailWorker.js';
import { registerAvatarRoutes } from './avatar.router.js';
import { createResolvers } from './graphql/resolvers.js';
import { schema } from './graphql/schema.js';
import { resolveIdentity } from './identity.js';

export async function createApp(
  application: Application,
  env: Environment,
  options: {
    emailWorker?: boolean;
    avatarWorker?: boolean;
    logger?: boolean;
  } = {},
) {
  const app = Fastify({
    logger: options.logger ?? env.NODE_ENV !== 'test',
    bodyLimit: 65536,
    logController: new LogController({ disableRequestLogging: true }),
  });
  await app.register(cookie);
  await app.register(cors, {
    origin: env.origins,
    credentials: true,
    allowedHeaders: ['content-type', 'x-financy-request'],
    methods: ['POST', 'GET', 'OPTIONS'],
  });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });

  app.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Cache-Control', 'no-store');
    if (
      request.url.split('?').at(0) !== '/graphql' ||
      request.method === 'OPTIONS'
    )
      return;
    if (
      request.headers['x-financy-request'] !== '1' ||
      (request.headers.origin && !env.origins.includes(request.headers.origin))
    ) {
      return reply
        .status(403)
        .send({ message: 'Origem da requisição não permitida.' });
    }
    if (
      request.method === 'POST' &&
      !request.headers['content-type']?.startsWith('application/json')
    ) {
      return reply.status(415).send({ message: 'Utilize application/json.' });
    }
  });

  await app.register(mercurius, {
    schema,
    resolvers: createResolvers(application, env),
    graphiql: false,
    allowBatchedQueries: false,
    queryDepth: 8,
    context: async (request) => ({
      identity: await resolveIdentity(application, env, request),
    }),
    errorFormatter: (execution) => ({
      statusCode: 200,
      response: {
        data: execution.data ?? null,
        errors: execution.errors.map((error) => {
          const original = error.originalError;
          if (original instanceof DomainError)
            return {
              message: original.message,
              ...(error.path ? { path: error.path } : {}),
              extensions: { code: original.code },
            };
          if (original instanceof ZodError)
            return {
              message: 'Confira os dados informados.',
              ...(error.path ? { path: error.path } : {}),
              extensions: { code: 'VALIDATION_ERROR' },
            };
          if (original)
            app.log.error(
              { code: 'GRAPHQL_INTERNAL_ERROR' },
              'Falha interna na operação GraphQL.',
            );
          return {
            message: original
              ? 'Não foi possível concluir a operação.'
              : 'Consulta GraphQL inválida.',
            extensions: {
              code: original ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR',
            },
          };
        }),
      },
    }),
  });
  await app.register(async (router) =>
    registerAvatarRoutes(router, application, env),
  );
  app.get('/health', async (_request, reply) => {
    try {
      await application.database.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      return reply.status(503).send({ status: 'unavailable' });
    }
  });
  const worker = new EmailWorker(
    application.database,
    application.deliverEmail,
    () =>
      app.log.error(
        { code: 'EMAIL_DELIVERY_FAILED' },
        'Falha ao processar e-mail de conta.',
      ),
  );
  const avatarWorker = new AvatarCleanupWorker(
    application.avatar.repository,
    application.avatar.storage,
    () =>
      app.log.error(
        { code: 'AVATAR_CLEANUP_FAILED' },
        'Falha ao limpar fotos antigas.',
      ),
  );
  app.addHook('onReady', async () => {
    if (options.emailWorker !== false) worker.start();
    if (options.avatarWorker !== false) avatarWorker.start();
  });
  app.addHook('onClose', async () => {
    await worker.stop();
    await avatarWorker.stop();
    await application.database.$disconnect();
  });
  return app;
}

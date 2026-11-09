import multipart from '@fastify/multipart';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { ZodError, z } from 'zod';
import { avatarMaxBytes } from '../../application/ports/avatar.port.js';
import { DomainError } from '../../domain/errors/domain.error.js';
import type { Application } from '../composition.js';
import type { Environment } from '../config/environment.js';
import { resolveIdentity } from './identity.js';

const version = z.coerce.number().int().min(0).max(2147483646);
const invalid = () =>
  new DomainError(
    'VALIDATION_ERROR',
    'Selecione uma única foto JPEG, PNG ou WebP.',
  );

export async function registerAvatarRoutes(
  app: FastifyInstance,
  application: Application,
  env: Environment,
) {
  await app.register(multipart, {
    limits: {
      fileSize: avatarMaxBytes,
      files: 1,
      fields: 1,
      parts: 2,
      fieldSize: 32,
      fieldNameSize: 32,
      headerPairs: 50,
    },
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof DomainError) {
      const status = {
        VALIDATION_ERROR: 400,
        UNAUTHENTICATED: 401,
        NOT_FOUND: 404,
        CONFLICT: 409,
      }[error.code];
      return reply
        .status(status)
        .send({ code: error.code, message: error.message });
    }
    if (error instanceof ZodError)
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Confira os dados da foto.',
      });
    const statusCode =
      error instanceof Error &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : 500;
    if (statusCode < 500)
      return reply.status(statusCode).send({
        code: 'VALIDATION_ERROR',
        message:
          statusCode === 413
            ? 'Escolha uma única imagem de até 5 MiB.'
            : 'Não foi possível ler a foto. Selecione uma imagem válida.',
      });
    app.log.error(
      { code: 'AVATAR_FAILED' },
      'Falha ao processar foto de perfil.',
    );
    return reply.status(500).send({
      code: 'INTERNAL_ERROR',
      message: 'Não foi possível salvar a foto. Tente novamente.',
    });
  });

  const activeUsers = new Set<string>();
  const identities = new WeakMap<
    FastifyRequest,
    { userId: string; sessionId: string }
  >();
  const limitUser = app.createRateLimit({
    max: 10,
    timeWindow: '1 minute',
    keyGenerator: (request) => identities.get(request)?.userId ?? request.ip,
  });
  app.post(
    '/me/avatar',
    {
      bodyLimit: avatarMaxBytes + 64 * 1024,
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      onRequest: async (request, reply) => {
        if (
          request.headers['x-financy-request'] !== '1' ||
          (request.headers.origin &&
            !env.origins.includes(request.headers.origin))
        )
          return reply.status(403).send({
            code: 'FORBIDDEN',
            message: 'Origem da requisição não permitida.',
          });
        const identity = await resolveIdentity(application, env, request);
        if (!identity)
          throw new DomainError(
            'UNAUTHENTICATED',
            'Faça login para continuar.',
          );
        identities.set(request, identity);
        const rate = await limitUser(request);
        if (!rate.isAllowed && rate.isExceeded)
          return reply
            .status(429)
            .header('Retry-After', rate.ttlInSeconds)
            .send({
              code: 'RATE_LIMITED',
              message: 'Muitos envios. Aguarde um minuto e tente novamente.',
            });
      },
    },
    async (request, reply) => {
      const identity = identities.get(request);
      if (!identity)
        throw new DomainError('UNAUTHENTICATED', 'Faça login para continuar.');
      if (activeUsers.size >= 2 || activeUsers.has(identity.userId))
        return reply.status(429).send({
          code: 'RATE_LIMITED',
          message: 'Há envios em andamento. Aguarde e tente novamente.',
        });
      activeUsers.add(identity.userId);
      const deadline = setTimeout(() => request.raw.destroy(), 30_000);
      deadline.unref();
      try {
        let bytes: Buffer | undefined;
        let mime = '';
        let expectedVersion: number | undefined;
        for await (const part of request.parts()) {
          if (part.type === 'file') {
            if (
              part.fieldname !== 'file' ||
              bytes ||
              !/\.(jpe?g|png|webp)$/i.test(part.filename)
            ) {
              part.file.resume();
              throw invalid();
            }
            mime = part.mimetype;
            bytes = await part.toBuffer();
            if (part.file.truncated) throw invalid();
          } else {
            if (
              part.fieldname !== 'expectedVersion' ||
              expectedVersion !== undefined ||
              part.valueTruncated
            )
              throw invalid();
            expectedVersion = version.parse(part.value);
          }
        }
        if (!bytes || expectedVersion === undefined) throw invalid();
        return await application.updateAvatar.execute({
          userId: identity.userId,
          expectedVersion,
          bytes,
          mime,
        });
      } finally {
        clearTimeout(deadline);
        activeUsers.delete(identity.userId);
      }
    },
  );

  app.get('/me/avatar/:version', async (request, reply) => {
    const identity = await resolveIdentity(application, env, request);
    if (!identity)
      throw new DomainError('UNAUTHENTICATED', 'Faça login para continuar.');
    const params = z.object({ version }).parse(request.params);
    const query = z.object({ account: z.uuid() }).parse(request.query);
    const account = await application.auth.repository.findById(identity.userId);
    if (
      query.account !== identity.userId ||
      !account?.user.avatarKey ||
      account.user.avatarVersion !== params.version
    )
      throw new DomainError('NOT_FOUND', 'Foto indisponível.');
    const bytes = await application.avatar.storage.read(account.user.avatarKey);
    if (!bytes) throw new DomainError('NOT_FOUND', 'Foto indisponível.');
    return reply.type('image/webp').send(Buffer.from(bytes));
  });
}

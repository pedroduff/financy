import type { MercuriusContext } from 'mercurius';
import { z } from 'zod';
import {
  categoryColors,
  categoryIcons,
} from '../../../domain/entities/category.entity.js';
import { DomainError } from '../../../domain/errors/domain.error.js';
import type { Application } from '../../composition.js';
import type { Environment } from '../../config/environment.js';
import { createAuthLimiter } from '../authLimiter.js';

declare module 'mercurius' {
  interface MercuriusContext {
    identity: { userId: string; sessionId: string } | null;
  }
}

const uuid = z.uuid();
const password = z.string().max(512);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const category = z.object({
  name: z.string().max(100),
  description: z.string().max(500).default(''),
  icon: z.enum(categoryIcons),
  color: z.enum(categoryColors),
});
const transaction = z.object({
  categoryId: uuid,
  description: z.string().max(500),
  amountInCents: z.string().max(19),
  type: z.enum(['INCOME', 'EXPENSE']),
  date,
});
const filters = z.object({
  page: z
    .number()
    .int()
    .min(1)
    .max(2147483647)
    .nullish()
    .transform((v) => v ?? 1),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .nullish()
    .transform((v) => v ?? 10),
  search: z
    .string()
    .max(200)
    .nullish()
    .transform((v) => v || undefined),
  type: z
    .enum(['INCOME', 'EXPENSE'])
    .nullish()
    .transform((v) => v ?? undefined),
  categoryId: uuid.nullish().transform((v) => v || undefined),
  startDate: date.nullish().transform((v) => v || undefined),
  endDate: date.nullish().transform((v) => v || undefined),
});

function userId(context: MercuriusContext) {
  if (!context.identity)
    throw new DomainError('UNAUTHENTICATED', 'Faça login para continuar.');
  return context.identity.userId;
}

export function createResolvers(application: Application, env: Environment) {
  const limitAuth = createAuthLimiter();
  const cookieName =
    env.NODE_ENV === 'production'
      ? '__Host-financy_session'
      : 'financy_session';
  const cookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
  return {
    Query: {
      health: () => 'ok',
      me: async (_root: unknown, _args: unknown, context: MercuriusContext) =>
        context.identity
          ? application.currentUser(context.identity.userId)
          : null,
      categories: (_root: unknown, _args: unknown, context: MercuriusContext) =>
        application.listCategories.execute({ userId: userId(context) }),
      categoryOverview: (
        _root: unknown,
        _args: unknown,
        context: MercuriusContext,
      ) => application.queries.categoryOverview(userId(context)),
      transactions: (
        _root: unknown,
        args: unknown,
        context: MercuriusContext,
      ) => {
        const value = z
          .object({
            filters: filters.nullish().transform((v) => v ?? filters.parse({})),
          })
          .parse(args);
        return application.listTransactions.execute({
          ...value.filters,
          userId: userId(context),
        });
      },
      dashboard: (_root: unknown, args: unknown, context: MercuriusContext) =>
        application.getDashboard.execute({
          ...z.object({ startDate: date, endDate: date }).parse(args),
          userId: userId(context),
        }),
    },
    Mutation: {
      removeAvatar: (
        _root: unknown,
        args: unknown,
        context: MercuriusContext,
      ) =>
        application.removeAvatar.execute({
          ...z
            .object({
              expectedVersion: z.number().int().min(0).max(2147483646),
            })
            .parse(args),
          userId: userId(context),
        }),
      signUp: (_root: unknown, args: unknown, context: MercuriusContext) => {
        const { input } = z
          .object({
            input: z.object({
              name: z.string().max(100),
              email: z.string().max(254),
              password,
            }),
          })
          .parse(args);
        limitAuth(context.reply.request.ip, input.email);
        return application.signUp.execute(input);
      },
      signIn: async (
        _root: unknown,
        args: unknown,
        context: MercuriusContext,
      ) => {
        const { input } = z
          .object({
            input: z.object({
              email: z.string().max(254),
              password,
              rememberMe: z
                .boolean()
                .nullish()
                .transform((v) => v ?? false),
            }),
          })
          .parse(args);
        limitAuth(context.reply.request.ip, input.email);
        const session = await application.signIn.execute(input);
        context.reply.setCookie(cookieName, session.token, {
          ...cookieOptions,
          ...(session.rememberMe ? { maxAge: session.lifetime } : {}),
        });
        return session.user;
      },
      signOut: async (
        _root: unknown,
        _args: unknown,
        context: MercuriusContext,
      ) => {
        if (context.identity)
          await application.auth.repository.deleteSession(
            context.identity.sessionId,
            context.identity.userId,
          );
        context.reply.clearCookie(cookieName, cookieOptions);
        return true;
      },
      updateProfile: (
        _root: unknown,
        args: unknown,
        context: MercuriusContext,
      ) =>
        application.updateProfile.execute({
          ...z.object({ name: z.string().max(100) }).parse(args),
          userId: userId(context),
        }),
      changePassword: async (
        _root: unknown,
        args: unknown,
        context: MercuriusContext,
      ) => {
        limitAuth(context.reply.request.ip, userId(context));
        await application.changePassword.execute({
          ...z
            .object({ currentPassword: password, newPassword: password })
            .parse(args),
          userId: userId(context),
        });
        context.reply.clearCookie(cookieName, cookieOptions);
        return true;
      },
      requestPasswordReset: (
        _root: unknown,
        args: unknown,
        context: MercuriusContext,
      ) => {
        const input = z.object({ email: z.string().max(254) }).parse(args);
        limitAuth(context.reply.request.ip, input.email);
        return application.requestPasswordReset.execute(input);
      },
      resetPassword: async (
        _root: unknown,
        args: unknown,
        context: MercuriusContext,
      ) => {
        limitAuth(
          context.reply.request.ip,
          `reset:${context.reply.request.ip}`,
        );
        await application.resetPassword.execute(
          z
            .object({
              token: z.string().min(32).max(128),
              newPassword: password,
            })
            .parse(args),
        );
        context.reply.clearCookie(cookieName, cookieOptions);
        return true;
      },
      createCategory: (
        _root: unknown,
        args: unknown,
        context: MercuriusContext,
      ) =>
        application.createCategory.execute({
          ...z.object({ input: category }).parse(args).input,
          userId: userId(context),
        }),
      updateCategory: (
        _root: unknown,
        args: unknown,
        context: MercuriusContext,
      ) => {
        const { id, input } = z
          .object({ id: uuid, input: category })
          .parse(args);
        return application.updateCategory.execute({
          ...input,
          id,
          userId: userId(context),
        });
      },
      deleteCategory: (
        _root: unknown,
        args: unknown,
        context: MercuriusContext,
      ) =>
        application.deleteCategory.execute({
          ...z.object({ id: uuid }).parse(args),
          userId: userId(context),
        }),
      createTransaction: (
        _root: unknown,
        args: unknown,
        context: MercuriusContext,
      ) =>
        application.createTransaction.execute({
          ...z.object({ input: transaction }).parse(args).input,
          userId: userId(context),
        }),
      updateTransaction: (
        _root: unknown,
        args: unknown,
        context: MercuriusContext,
      ) => {
        const { id, input } = z
          .object({ id: uuid, input: transaction })
          .parse(args);
        return application.updateTransaction.execute({
          ...input,
          id,
          userId: userId(context),
        });
      },
      deleteTransaction: (
        _root: unknown,
        args: unknown,
        context: MercuriusContext,
      ) =>
        application.deleteTransaction.execute({
          ...z.object({ id: uuid }).parse(args),
          userId: userId(context),
        }),
    },
  };
}

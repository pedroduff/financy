import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('127.0.0.1'),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  FRONTEND_URL: z.url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  AVATAR_DIRECTORY: z.string().min(1).default('./storage/avatars'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
  SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  MAIL_FROM: z.string().default('Financy <no-reply@financy.local>'),
});

export function readEnvironment(source: NodeJS.ProcessEnv) {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(
      `Configuração inválida: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  }
  const env = result.data;
  const origins = env.CORS_ORIGINS.split(',').map(
    (origin) => new URL(origin.trim()).origin,
  );
  if (
    env.NODE_ENV === 'production' &&
    (env.JWT_SECRET.startsWith('replace-') ||
      !env.FRONTEND_URL.startsWith('https://') ||
      origins.some((origin) => !origin.startsWith('https://')))
  )
    throw new Error('Produção exige segredo próprio e origens HTTPS.');
  return { ...env, origins };
}

export type Environment = ReturnType<typeof readEnvironment>;

import type { FastifyRequest } from 'fastify';
import { DomainError } from '../../domain/errors/domain.error.js';
import type { Application } from '../composition.js';
import type { Environment } from '../config/environment.js';

export async function resolveIdentity(
  application: Application,
  env: Environment,
  request: FastifyRequest,
) {
  const name =
    env.NODE_ENV === 'production'
      ? '__Host-financy_session'
      : 'financy_session';
  const token = request.cookies[name];
  if (!token) return null;
  try {
    const signed = await application.auth.sessions.verify(token);
    return (await application.auth.repository.findSession(
      signed.sessionId,
      signed.userId,
      new Date(),
    ))
      ? signed
      : null;
  } catch (error) {
    if (error instanceof DomainError) return null;
    throw error;
  }
}

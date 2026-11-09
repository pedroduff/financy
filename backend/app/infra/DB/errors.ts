import { DomainError } from '../../domain/errors/domain.error.js';
import { Prisma } from './generated/client.js';

export function translateDatabaseError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002')
      return new DomainError(
        'CONFLICT',
        'Já existe um registro com esses dados.',
      );
    if (error.code === 'P2003')
      return new DomainError(
        'CONFLICT',
        'O registro possui vínculos ou a categoria é inválida.',
      );
    if (error.code === 'P2025')
      return new DomainError('NOT_FOUND', 'Registro não encontrado.');
  }
  return error;
}

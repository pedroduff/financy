import { DomainError } from '../errors/domain.error.js';

export function validatePassword(password: string) {
  const length = [...password].length;
  if (length < 15 || length > 128) {
    throw new DomainError(
      'VALIDATION_ERROR',
      'A senha deve ter entre 15 e 128 caracteres.',
    );
  }
}

import { DomainError } from '../errors/domain.error.js';

export class Email {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value.trim().toLowerCase();
    if (
      normalized.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ) {
      throw new DomainError('VALIDATION_ERROR', 'Informe um e-mail válido.');
    }
    this.value = normalized;
    Object.freeze(this);
  }

  equals(other: Email) {
    return this.value === other.value;
  }
}

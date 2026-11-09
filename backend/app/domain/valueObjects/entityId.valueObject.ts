import { DomainError } from '../errors/domain.error.js';

export class EntityId {
  public readonly value: string;

  constructor(value: string) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      throw new DomainError('VALIDATION_ERROR', 'Identificador inválido.');
    }
    this.value = value.toLowerCase();
    Object.freeze(this);
  }

  equals(other: EntityId) {
    return this.value === other.value;
  }
}

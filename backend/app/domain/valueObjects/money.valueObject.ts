import { DomainError } from '../errors/domain.error.js';

export class Money {
  public readonly currency = 'BRL';
  public readonly cents: bigint;

  constructor(cents: string | bigint) {
    if (
      !/^[1-9]\d{0,18}$/.test(String(cents)) ||
      BigInt(cents) > 9223372036854775807n
    ) {
      throw new DomainError(
        'VALIDATION_ERROR',
        'Informe um valor positivo em centavos inteiros.',
      );
    }
    this.cents = BigInt(cents);
    Object.freeze(this);
  }

  equals(other: Money) {
    return this.cents === other.cents;
  }
}

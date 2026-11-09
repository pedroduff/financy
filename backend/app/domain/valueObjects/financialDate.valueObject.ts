import { DomainError } from '../errors/domain.error.js';

export class FinancialDate {
  public readonly value: string;

  constructor(value: string) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      value.startsWith('0000') ||
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value
    ) {
      throw new DomainError('VALIDATION_ERROR', 'Informe uma data válida.');
    }
    this.value = value;
    Object.freeze(this);
  }

  equals(other: FinancialDate) {
    return this.value === other.value;
  }
}

export class FinancialPeriod {
  constructor(
    public readonly start: FinancialDate,
    public readonly end: FinancialDate,
  ) {
    if (start.value > end.value) {
      throw new DomainError(
        'VALIDATION_ERROR',
        'A data inicial deve ser anterior ou igual à data final.',
      );
    }
    Object.freeze(this);
  }

  includes(date: FinancialDate) {
    return date.value >= this.start.value && date.value <= this.end.value;
  }
}

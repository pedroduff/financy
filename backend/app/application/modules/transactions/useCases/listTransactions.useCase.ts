import { DomainError } from '../../../../domain/errors/domain.error.js';
import { EntityId } from '../../../../domain/valueObjects/entityId.valueObject.js';
import {
  FinancialDate,
  FinancialPeriod,
} from '../../../../domain/valueObjects/financialDate.valueObject.js';
import type {
  FinanceQueries,
  TransactionFilters,
} from '../../../ports/financeQueries.port.js';

export class ListTransactions {
  constructor(private readonly queries: FinanceQueries) {}

  async execute(input: TransactionFilters) {
    new EntityId(input.userId);
    if (input.categoryId) new EntityId(input.categoryId);
    if (
      !Number.isInteger(input.page) ||
      input.page < 1 ||
      !Number.isInteger(input.pageSize) ||
      input.pageSize < 1 ||
      input.pageSize > 100 ||
      (input.page - 1) * input.pageSize > 2147483647
    ) {
      throw new DomainError('VALIDATION_ERROR', 'Paginação inválida.');
    }
    if (input.startDate) new FinancialDate(input.startDate);
    if (input.endDate) new FinancialDate(input.endDate);
    if (input.startDate && input.endDate)
      new FinancialPeriod(
        new FinancialDate(input.startDate),
        new FinancialDate(input.endDate),
      );
    return this.queries.listTransactions(input);
  }
}

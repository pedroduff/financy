import { EntityId } from '../../../../domain/valueObjects/entityId.valueObject.js';
import {
  FinancialDate,
  FinancialPeriod,
} from '../../../../domain/valueObjects/financialDate.valueObject.js';
import type { FinanceQueries } from '../../../ports/financeQueries.port.js';

export class GetDashboard {
  constructor(private readonly queries: FinanceQueries) {}

  async execute(input: { userId: string; startDate: string; endDate: string }) {
    new EntityId(input.userId);
    new FinancialPeriod(
      new FinancialDate(input.startDate),
      new FinancialDate(input.endDate),
    );
    return this.queries.dashboard(input.userId, input.startDate, input.endDate);
  }
}

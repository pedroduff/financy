import type { Transaction } from '../entities/transaction.entity.js';
import type { EntityId } from '../valueObjects/entityId.valueObject.js';
import type { FinancialPeriod } from '../valueObjects/financialDate.valueObject.js';

export function summarizeTransactions(
  userId: EntityId,
  period: FinancialPeriod,
  transactions: readonly Transaction[],
) {
  let incomeInCents = 0n;
  let expenseInCents = 0n;
  let transactionCount = 0;

  for (const transaction of transactions) {
    const { amount, date, type } = transaction.details;
    if (!transaction.userId.equals(userId) || !period.includes(date)) {
      continue;
    }
    transactionCount += 1;
    if (type === 'INCOME') {
      incomeInCents += amount.cents;
    } else {
      expenseInCents += amount.cents;
    }
  }

  return createFinancialSummary(
    incomeInCents,
    expenseInCents,
    transactionCount,
  );
}

export function createFinancialSummary(
  incomeInCents: bigint,
  expenseInCents: bigint,
  transactionCount: number,
) {
  return {
    incomeInCents,
    expenseInCents,
    balanceInCents: incomeInCents - expenseInCents,
    transactionCount,
  };
}

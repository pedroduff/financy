import type { Transaction } from '../../../../domain/entities/transaction.entity.js';

export function toTransactionDto(transaction: Transaction) {
  const { description, amount, type, date } = transaction.details;
  return {
    id: transaction.id.value,
    categoryId: transaction.categoryId.value,
    description,
    amountInCents: amount.cents.toString(),
    type,
    date: date.value,
  };
}

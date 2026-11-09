import type { TransactionType } from '../../../../domain/entities/transaction.entity.js';

export type TransactionInput = {
  userId: string;
  categoryId: string;
  description: string;
  amountInCents: string;
  type: TransactionType;
  date: string;
};

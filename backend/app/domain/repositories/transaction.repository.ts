import type { Transaction } from '../entities/transaction.entity.js';
import type { EntityId } from '../valueObjects/entityId.valueObject.js';

export interface TransactionRepository {
  findById: (id: EntityId, userId: EntityId) => Promise<Transaction | null>;
  create: (transaction: Transaction) => Promise<void>;
  update: (transaction: Transaction) => Promise<void>;
  delete: (id: EntityId, userId: EntityId) => Promise<void>;
}

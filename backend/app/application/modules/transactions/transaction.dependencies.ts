import type { CategoryRepository } from '../../../domain/repositories/category.repository.js';
import type { TransactionRepository } from '../../../domain/repositories/transaction.repository.js';
import type { IdGenerator } from '../../ports/idGenerator.port.js';

export type TransactionDependencies = {
  transactions: TransactionRepository;
  categories: CategoryRepository;
  ids: IdGenerator;
};

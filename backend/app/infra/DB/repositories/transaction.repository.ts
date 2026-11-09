import { Transaction } from '../../../domain/entities/transaction.entity.js';
import type { TransactionRepository } from '../../../domain/repositories/transaction.repository.js';
import { EntityId } from '../../../domain/valueObjects/entityId.valueObject.js';
import { FinancialDate } from '../../../domain/valueObjects/financialDate.valueObject.js';
import { Money } from '../../../domain/valueObjects/money.valueObject.js';
import type { Database } from '../client.js';
import { translateDatabaseError } from '../errors.js';
import type {
  Category as CategoryRecord,
  Transaction as TransactionRecord,
} from '../generated/client.js';
import { toCategory } from './category.repository.js';

function toTransaction(
  record: TransactionRecord & { category: CategoryRecord },
) {
  return new Transaction(
    new EntityId(record.id),
    {
      userId: new EntityId(record.userId),
      description: record.description,
      amount: new Money(record.amountInCents),
      type: record.type,
      date: new FinancialDate(record.date.toISOString().slice(0, 10)),
    },
    toCategory(record.category),
  );
}

function toRecord(transaction: Transaction) {
  const { description, amount, type, date } = transaction.details;
  return {
    id: transaction.id.value,
    userId: transaction.userId.value,
    categoryId: transaction.categoryId.value,
    description,
    amountInCents: amount.cents,
    type,
    date: new Date(`${date.value}T00:00:00Z`),
  };
}

export class PrismaTransactionRepository implements TransactionRepository {
  constructor(private readonly database: Database) {}

  async findById(id: EntityId, userId: EntityId) {
    const record = await this.database.transaction.findFirst({
      where: { id: id.value, userId: userId.value },
      include: { category: true },
    });
    return record ? toTransaction(record) : null;
  }

  async create(transaction: Transaction) {
    try {
      await this.database.transaction.create({ data: toRecord(transaction) });
    } catch (error) {
      throw translateDatabaseError(error);
    }
  }

  async update(transaction: Transaction) {
    try {
      const { id, userId, ...data } = toRecord(transaction);
      await this.database.transaction.update({ where: { id, userId }, data });
    } catch (error) {
      throw translateDatabaseError(error);
    }
  }

  async delete(id: EntityId, userId: EntityId) {
    try {
      await this.database.transaction.delete({
        where: { id: id.value, userId: userId.value },
      });
    } catch (error) {
      throw translateDatabaseError(error);
    }
  }
}

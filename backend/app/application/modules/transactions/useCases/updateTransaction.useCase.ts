import { DomainError } from '../../../../domain/errors/domain.error.js';
import { EntityId } from '../../../../domain/valueObjects/entityId.valueObject.js';
import { FinancialDate } from '../../../../domain/valueObjects/financialDate.valueObject.js';
import { Money } from '../../../../domain/valueObjects/money.valueObject.js';
import type { TransactionInput } from '../dataTransferObjects/transaction.dataTransferObject.js';
import { toTransactionDto } from '../mappers/transaction.mapper.js';
import type { TransactionDependencies } from '../transaction.dependencies.js';

export class UpdateTransaction {
  constructor(private readonly dependencies: TransactionDependencies) {}

  async execute(input: TransactionInput & { id: string }) {
    const userId = new EntityId(input.userId);
    const transaction = await this.dependencies.transactions.findById(
      new EntityId(input.id),
      userId,
    );
    if (!transaction?.userId.equals(userId))
      throw new DomainError('NOT_FOUND', 'Transação não encontrada.');
    const category = await this.dependencies.categories.findById(
      new EntityId(input.categoryId),
      userId,
    );
    if (!category)
      throw new DomainError('NOT_FOUND', 'Categoria não encontrada.');
    transaction.update(
      {
        description: input.description,
        amount: new Money(input.amountInCents),
        type: input.type,
        date: new FinancialDate(input.date),
      },
      category,
    );
    await this.dependencies.transactions.update(transaction);
    return toTransactionDto(transaction);
  }
}

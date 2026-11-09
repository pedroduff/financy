import { DomainError } from '../../../../domain/errors/domain.error.js';
import { EntityId } from '../../../../domain/valueObjects/entityId.valueObject.js';
import type { TransactionDependencies } from '../transaction.dependencies.js';

export class DeleteTransaction {
  constructor(private readonly dependencies: TransactionDependencies) {}

  async execute(input: { id: string; userId: string }) {
    const userId = new EntityId(input.userId);
    const id = new EntityId(input.id);
    const transaction = await this.dependencies.transactions.findById(
      id,
      userId,
    );
    if (!transaction?.userId.equals(userId))
      throw new DomainError('NOT_FOUND', 'Transação não encontrada.');
    await this.dependencies.transactions.delete(id, userId);
    return { id: id.value };
  }
}

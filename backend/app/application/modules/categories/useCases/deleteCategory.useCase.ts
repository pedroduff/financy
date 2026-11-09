import { DomainError } from '../../../../domain/errors/domain.error.js';
import type { CategoryRepository } from '../../../../domain/repositories/category.repository.js';
import { EntityId } from '../../../../domain/valueObjects/entityId.valueObject.js';
import type { CategoryIdentityInput } from '../dataTransferObjects/category.dataTransferObject.js';

export class DeleteCategory {
  constructor(private readonly repository: CategoryRepository) {}

  async execute(input: CategoryIdentityInput) {
    const userId = new EntityId(input.userId);
    const id = new EntityId(input.id);
    const category = await this.repository.findById(id, userId);
    if (!category?.userId.equals(userId)) {
      throw new DomainError('NOT_FOUND', 'Categoria não encontrada.');
    }
    await this.repository.delete(id, userId);
    return { id: id.value };
  }
}

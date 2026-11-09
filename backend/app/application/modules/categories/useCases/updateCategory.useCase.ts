import { DomainError } from '../../../../domain/errors/domain.error.js';
import type { CategoryRepository } from '../../../../domain/repositories/category.repository.js';
import { EntityId } from '../../../../domain/valueObjects/entityId.valueObject.js';
import type { UpdateCategoryInput } from '../dataTransferObjects/category.dataTransferObject.js';
import { toCategoryDto } from '../mappers/category.mapper.js';

export class UpdateCategory {
  constructor(private readonly repository: CategoryRepository) {}

  async execute(input: UpdateCategoryInput) {
    const userId = new EntityId(input.userId);
    const category = await this.repository.findById(
      new EntityId(input.id),
      userId,
    );
    if (!category?.userId.equals(userId)) {
      throw new DomainError('NOT_FOUND', 'Categoria não encontrada.');
    }
    category.update(input);
    await this.repository.update(category);
    return toCategoryDto(category);
  }
}

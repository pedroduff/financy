import type { CategoryRepository } from '../../../../domain/repositories/category.repository.js';
import { EntityId } from '../../../../domain/valueObjects/entityId.valueObject.js';
import { toCategoryDto } from '../mappers/category.mapper.js';

export class ListCategories {
  constructor(private readonly repository: CategoryRepository) {}

  async execute(input: { userId: string }) {
    const categories = await this.repository.findAll(
      new EntityId(input.userId),
    );
    return categories.map(toCategoryDto);
  }
}

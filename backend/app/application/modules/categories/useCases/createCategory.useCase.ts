import { Category } from '../../../../domain/entities/category.entity.js';
import type { CategoryRepository } from '../../../../domain/repositories/category.repository.js';
import { EntityId } from '../../../../domain/valueObjects/entityId.valueObject.js';
import type { IdGenerator } from '../../../ports/idGenerator.port.js';
import type { CreateCategoryInput } from '../dataTransferObjects/category.dataTransferObject.js';
import { toCategoryDto } from '../mappers/category.mapper.js';

export class CreateCategory {
  constructor(
    private readonly repository: CategoryRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: CreateCategoryInput) {
    const category = new Category(new EntityId(this.ids.generate()), {
      userId: new EntityId(input.userId),
      name: input.name,
      description: input.description,
      icon: input.icon,
      color: input.color,
    });
    await this.repository.create(category);
    return toCategoryDto(category);
  }
}

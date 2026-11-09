import type { CategoryDetails } from '../../../domain/entities/category.entity.js';
import { Category } from '../../../domain/entities/category.entity.js';
import type { CategoryRepository } from '../../../domain/repositories/category.repository.js';
import { EntityId } from '../../../domain/valueObjects/entityId.valueObject.js';
import type { Database } from '../client.js';
import { translateDatabaseError } from '../errors.js';
import type { Category as CategoryRecord } from '../generated/client.js';

export function toCategory(record: CategoryRecord) {
  return new Category(new EntityId(record.id), {
    userId: new EntityId(record.userId),
    name: record.name,
    description: record.description,
    icon: record.icon as CategoryDetails['icon'],
    color: record.color as CategoryDetails['color'],
  });
}

export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly database: Database) {}

  async findById(id: EntityId, userId: EntityId) {
    const record = await this.database.category.findFirst({
      where: { id: id.value, userId: userId.value },
    });
    return record ? toCategory(record) : null;
  }

  async findAll(userId: EntityId) {
    return (
      await this.database.category.findMany({
        where: { userId: userId.value },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      })
    ).map(toCategory);
  }

  async create(category: Category) {
    try {
      await this.database.category.create({
        data: {
          id: category.id.value,
          userId: category.userId.value,
          ...category.details,
          normalizedName: category.normalizedName,
        },
      });
    } catch (error) {
      throw translateDatabaseError(error);
    }
  }

  async update(category: Category) {
    try {
      await this.database.category.update({
        where: {
          id_userId: { id: category.id.value, userId: category.userId.value },
        },
        data: { ...category.details, normalizedName: category.normalizedName },
      });
    } catch (error) {
      throw translateDatabaseError(error);
    }
  }

  async delete(id: EntityId, userId: EntityId) {
    try {
      await this.database.category.delete({
        where: { id_userId: { id: id.value, userId: userId.value } },
      });
    } catch (error) {
      throw translateDatabaseError(error);
    }
  }
}

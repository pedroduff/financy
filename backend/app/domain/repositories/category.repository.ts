import type { Category } from '../entities/category.entity.js';
import type { EntityId } from '../valueObjects/entityId.valueObject.js';

export interface CategoryRepository {
  findById: (id: EntityId, userId: EntityId) => Promise<Category | null>;
  findAll: (userId: EntityId) => Promise<Category[]>;
  create: (category: Category) => Promise<void>;
  update: (category: Category) => Promise<void>;
  delete: (id: EntityId, userId: EntityId) => Promise<void>;
}

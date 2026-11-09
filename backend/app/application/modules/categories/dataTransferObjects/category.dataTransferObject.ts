import type { CategoryDetails } from '../../../../domain/entities/category.entity.js';

export type CreateCategoryInput = CategoryDetails & { userId: string };
export type UpdateCategoryInput = CreateCategoryInput & { id: string };
export type CategoryIdentityInput = { userId: string; id: string };

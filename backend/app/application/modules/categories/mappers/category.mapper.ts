import type { Category } from '../../../../domain/entities/category.entity.js';

export function toCategoryDto(category: Category) {
  return {
    id: category.id.value,
    ...category.details,
  };
}

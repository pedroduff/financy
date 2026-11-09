import { Category } from '../../../../domain/entities/category.entity.js';
import { DomainError } from '../../../../domain/errors/domain.error.js';
import type { CategoryRepository } from '../../../../domain/repositories/category.repository.js';
import { EntityId } from '../../../../domain/valueObjects/entityId.valueObject.js';
import { CreateCategory } from './createCategory.useCase.js';
import { DeleteCategory } from './deleteCategory.useCase.js';
import { ListCategories } from './listCategories.useCase.js';
import { UpdateCategory } from './updateCategory.useCase.js';

const userId = '00000000-0000-4000-8000-000000000001';
const otherUserId = '00000000-0000-4000-8000-000000000002';
const id = '00000000-0000-4000-8000-000000000003';
const details = {
  name: ' Alimentação ',
  description: '',
  icon: 'utensils',
  color: 'green',
} as const;

function setup() {
  const categories = new Map<string, Category>();
  const repository: CategoryRepository = {
    findById: async (categoryId, ownerId) => {
      const category = categories.get(categoryId.value);
      return category?.userId.equals(ownerId) ? category : null;
    },
    findAll: async (ownerId) =>
      [...categories.values()].filter((category) =>
        category.userId.equals(ownerId),
      ),
    create: async (category) => {
      categories.set(category.id.value, category);
    },
    update: vi.fn(async (category) => {
      categories.set(category.id.value, category);
    }),
    delete: vi.fn(async (categoryId) => {
      categories.delete(categoryId.value);
    }),
  };
  categories.set(
    id,
    new Category(new EntityId(id), {
      ...details,
      userId: new EntityId(userId),
    }),
  );
  return { repository };
}

describe('category use cases', () => {
  it('creates a category under the authenticated identity and returns a DTO', async () => {
    const { repository } = setup();
    const useCase = new CreateCategory(repository, { generate: () => id });
    expect(await useCase.execute({ ...details, userId })).toEqual({
      ...details,
      name: 'Alimentação',
      id,
    });
  });

  it('lists only categories owned by the requested identity', async () => {
    const { repository } = setup();
    const useCase = new ListCategories(repository);
    expect(await useCase.execute({ userId: otherUserId })).toEqual([]);
    expect(await useCase.execute({ userId })).toHaveLength(1);
  });

  it('rejects category changes and deletes across user boundaries', async () => {
    const { repository } = setup();
    await expect(
      new UpdateCategory(repository).execute({
        ...details,
        name: 'Outro nome',
        id,
        userId: otherUserId,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      new DeleteCategory(repository).execute({
        id,
        userId: otherUserId,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('propagates the conflict when the repository prevents deletion in use', async () => {
    const { repository } = setup();
    repository.delete = vi.fn(async () => {
      throw new DomainError('CONFLICT', 'A categoria possui transações.');
    });
    await expect(
      new DeleteCategory(repository).execute({ id, userId }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});

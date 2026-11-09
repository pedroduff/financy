import { DomainError } from '../errors/domain.error.js';
import type { EntityId } from '../valueObjects/entityId.valueObject.js';
import { Entity } from './entity.js';

export const categoryIcons = [
  'briefcase-business',
  'car-front',
  'heart-pulse',
  'piggy-bank',
  'shopping-cart',
  'ticket',
  'tool-case',
  'utensils',
  'paw-print',
  'house',
  'gift',
  'dumbbell',
  'book-open',
  'baggage-claim',
  'mailbox',
  'receipt-text',
] as const;

export const categoryColors = [
  'green',
  'blue',
  'purple',
  'pink',
  'red',
  'orange',
  'yellow',
] as const;

export type CategoryDetails = {
  name: string;
  description: string;
  icon: (typeof categoryIcons)[number];
  color: (typeof categoryColors)[number];
};

type CategoryProps = CategoryDetails & { userId: EntityId };

export class Category extends Entity<CategoryProps> {
  constructor(id: EntityId, props: CategoryProps) {
    super(id, { ...props });
    this.update(props);
  }

  get userId() {
    return this.props.userId;
  }

  get details() {
    const { name, description, icon, color } = this.props;
    return { name, description, icon, color };
  }

  get normalizedName() {
    return this.props.name.toLowerCase();
  }

  update(details: CategoryDetails) {
    const name = details.name.trim().normalize('NFC');
    const description = details.description.trim();
    if (!name || name.length > 100 || description.length > 500) {
      throw new DomainError(
        'VALIDATION_ERROR',
        'Informe um nome de até 100 e uma descrição de até 500 caracteres.',
      );
    }
    if (
      !categoryIcons.includes(details.icon) ||
      !categoryColors.includes(details.color)
    ) {
      throw new DomainError(
        'VALIDATION_ERROR',
        'Selecione um ícone e uma cor válidos.',
      );
    }
    this.props = {
      userId: this.props.userId,
      name,
      description,
      icon: details.icon,
      color: details.color,
    };
  }
}

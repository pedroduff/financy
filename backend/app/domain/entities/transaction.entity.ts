import { DomainError } from '../errors/domain.error.js';
import type { EntityId } from '../valueObjects/entityId.valueObject.js';
import type { FinancialDate } from '../valueObjects/financialDate.valueObject.js';
import type { Money } from '../valueObjects/money.valueObject.js';
import type { Category } from './category.entity.js';
import { Entity } from './entity.js';

export type TransactionType = 'INCOME' | 'EXPENSE';

export type TransactionDetails = {
  description: string;
  amount: Money;
  type: TransactionType;
  date: FinancialDate;
};

type TransactionProps = TransactionDetails & {
  userId: EntityId;
  categoryId: EntityId;
};

export class Transaction extends Entity<TransactionProps> {
  constructor(
    id: EntityId,
    props: TransactionDetails & { userId: EntityId },
    category: Category,
  ) {
    super(id, { ...props, categoryId: category.id });
    this.update(props, category);
  }

  get userId() {
    return this.props.userId;
  }

  get categoryId() {
    return this.props.categoryId;
  }

  get details() {
    const { description, amount, type, date } = this.props;
    return { description, amount, type, date };
  }

  get signedCents() {
    return this.props.type === 'INCOME'
      ? this.props.amount.cents
      : -this.props.amount.cents;
  }

  update(details: TransactionDetails, category: Category) {
    if (!category.userId.equals(this.userId)) {
      throw new DomainError('NOT_FOUND', 'Categoria não encontrada.');
    }
    const description = details.description.trim();
    if (!description || description.length > 500) {
      throw new DomainError(
        'VALIDATION_ERROR',
        'A descrição deve ter entre 1 e 500 caracteres.',
      );
    }
    if (details.type !== 'INCOME' && details.type !== 'EXPENSE') {
      throw new DomainError('VALIDATION_ERROR', 'Tipo de transação inválido.');
    }
    this.props = {
      userId: this.userId,
      categoryId: category.id,
      description,
      amount: details.amount,
      type: details.type,
      date: details.date,
    };
  }
}

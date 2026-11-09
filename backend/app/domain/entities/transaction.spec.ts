import { summarizeTransactions } from '../services/financialSummary.service.js';
import { EntityId } from '../valueObjects/entityId.valueObject.js';
import {
  FinancialDate,
  FinancialPeriod,
} from '../valueObjects/financialDate.valueObject.js';
import { Money } from '../valueObjects/money.valueObject.js';
import { Category } from './category.entity.js';
import { Transaction, type TransactionType } from './transaction.entity.js';

const userId = new EntityId('00000000-0000-4000-8000-000000000001');
const otherUserId = new EntityId('00000000-0000-4000-8000-000000000002');
const categoryId = new EntityId('00000000-0000-4000-8000-000000000003');
const transactionId = new EntityId('00000000-0000-4000-8000-000000000004');

function createCategory(ownerId = userId) {
  return new Category(categoryId, {
    userId: ownerId,
    name: '  Alimentação  ',
    description: '',
    icon: 'utensils',
    color: 'green',
  });
}

function createTransaction(
  amount: string,
  type: TransactionType,
  date: string,
  ownerId = userId,
) {
  return new Transaction(
    transactionId,
    {
      userId: ownerId,
      description: 'Lançamento',
      amount: new Money(amount),
      type,
      date: new FinancialDate(date),
    },
    createCategory(ownerId),
  );
}

describe('Transaction', () => {
  it('rejects another user category when creating a transaction', () => {
    const existing = createTransaction('100', 'INCOME', '2099-12-01');
    expect(
      () =>
        new Transaction(
          transactionId,
          {
            ...existing.details,
            userId,
          },
          createCategory(otherUserId),
        ),
    ).toThrow('Categoria não encontrada.');
  });

  it('preserves the transaction when an invalid category change is rejected', () => {
    const transaction = createTransaction('100', 'INCOME', '2099-12-01');
    expect(() =>
      transaction.update(
        { ...transaction.details, type: 'EXPENSE' },
        createCategory(otherUserId),
      ),
    ).toThrow('Categoria não encontrada.');
    expect(transaction.signedCents).toBe(100n);
    expect(transaction.categoryId.equals(categoryId)).toBe(true);
  });

  it('changes amount and type while preserving identity', () => {
    const transaction = createTransaction('100', 'INCOME', '2099-12-01');
    transaction.update(
      { ...transaction.details, amount: new Money('300'), type: 'EXPENSE' },
      createCategory(),
    );
    expect(transaction.signedCents).toBe(-300n);
    expect(transaction.id.equals(transactionId)).toBe(true);
  });
});

describe('financial summary', () => {
  const period = new FinancialPeriod(
    new FinancialDate('2099-12-01'),
    new FinancialDate('2099-12-31'),
  );

  it('includes future income and expenses within the selected interval only', () => {
    const result = summarizeTransactions(userId, period, [
      createTransaction('500000', 'INCOME', '2099-12-01'),
      createTransaction('150000', 'EXPENSE', '2099-12-15'),
      createTransaction('30000', 'EXPENSE', '2099-12-31'),
      createTransaction('999999', 'INCOME', '2099-11-30'),
      createTransaction('999999', 'EXPENSE', '2100-01-01'),
      createTransaction('999999', 'INCOME', '2099-12-15', otherUserId),
    ]);
    expect(result).toEqual({
      incomeInCents: 500000n,
      expenseInCents: 180000n,
      balanceInCents: 320000n,
      transactionCount: 3,
    });
  });

  it('supports empty periods and negative balances without losing precision', () => {
    expect(summarizeTransactions(userId, period, []).balanceInCents).toBe(0n);
    expect(
      summarizeTransactions(userId, period, [
        createTransaction('9007199254740993', 'EXPENSE', '2099-12-31'),
      ]).balanceInCents,
    ).toBe(-9007199254740993n);
  });
});

describe('Category', () => {
  it('normalizes names for uniqueness without altering identity', () => {
    const category = createCategory();
    expect(category.normalizedName).toBe('alimentação');
    category.update({ ...category.details, name: ' ALIMENTAÇÃO ' });
    expect(category.normalizedName).toBe('alimentação');
    expect(category.id.equals(categoryId)).toBe(true);
  });
});

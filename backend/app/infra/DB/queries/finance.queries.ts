import type {
  FinanceQueries,
  TransactionFilters,
} from '../../../application/ports/financeQueries.port.js';
import { createFinancialSummary } from '../../../domain/services/financialSummary.service.js';
import type { Database } from '../client.js';
import type { Prisma, Transaction } from '../generated/client.js';

function toRow(record: Transaction) {
  return {
    id: record.id,
    categoryId: record.categoryId,
    description: record.description,
    amountInCents: record.amountInCents.toString(),
    type: record.type,
    date: record.date.toISOString().slice(0, 10),
  };
}

function summarize(
  groups: {
    categoryId: string;
    type: string;
    _count: { _all: number };
    _sum: { amountInCents: bigint | null };
  }[],
) {
  const summaries = new Map<
    string,
    {
      categoryId: string;
      transactionCount: number;
      income: bigint;
      expense: bigint;
    }
  >();
  for (const group of groups) {
    const item = summaries.get(group.categoryId) ?? {
      categoryId: group.categoryId,
      transactionCount: 0,
      income: 0n,
      expense: 0n,
    };
    item.transactionCount += group._count._all;
    if (group.type === 'INCOME') item.income += group._sum.amountInCents ?? 0n;
    else item.expense += group._sum.amountInCents ?? 0n;
    summaries.set(item.categoryId, item);
  }
  return [...summaries.values()].map((item) => ({
    categoryId: item.categoryId,
    transactionCount: item.transactionCount,
    incomeInCents: item.income.toString(),
    expenseInCents: item.expense.toString(),
  }));
}

export class PrismaFinanceQueries implements FinanceQueries {
  constructor(private readonly database: Database) {}

  async listTransactions(input: TransactionFilters) {
    const where: Prisma.TransactionWhereInput = {
      userId: input.userId,
      ...(input.search
        ? { description: { contains: input.search, mode: 'insensitive' } }
        : {}),
      ...(input.type ? { type: input.type } : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      date: {
        ...(input.startDate
          ? { gte: new Date(`${input.startDate}T00:00:00Z`) }
          : {}),
        ...(input.endDate
          ? { lte: new Date(`${input.endDate}T00:00:00Z`) }
          : {}),
      },
    };
    const [items, totalCount] = await this.database.$transaction(
      [
        this.database.transaction.findMany({
          where,
          orderBy: [{ date: 'desc' }, { id: 'desc' }],
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        this.database.transaction.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return {
      items: items.map(toRow),
      totalCount,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async dashboard(userId: string, startDate: string, endDate: string) {
    const where = {
      userId,
      date: {
        gte: new Date(`${startDate}T00:00:00Z`),
        lte: new Date(`${endDate}T00:00:00Z`),
      },
    };
    const [groups, recent] = await this.database.$transaction(
      [
        this.database.transaction.groupBy({
          by: ['categoryId', 'type'],
          where,
          _sum: { amountInCents: true },
          _count: { _all: true },
        }),
        this.database.transaction.findMany({
          where,
          orderBy: [{ date: 'desc' }, { id: 'desc' }],
          take: 5,
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    const categorySummaries = summarize(groups);
    const income = categorySummaries.reduce(
      (sum, item) => sum + BigInt(item.incomeInCents),
      0n,
    );
    const expense = categorySummaries.reduce(
      (sum, item) => sum + BigInt(item.expenseInCents),
      0n,
    );
    const summary = createFinancialSummary(
      income,
      expense,
      categorySummaries.reduce((sum, item) => sum + item.transactionCount, 0),
    );
    return {
      incomeInCents: summary.incomeInCents.toString(),
      expenseInCents: summary.expenseInCents.toString(),
      balanceInCents: summary.balanceInCents.toString(),
      transactionCount: summary.transactionCount,
      recentTransactions: recent.map(toRow),
      categorySummaries,
    };
  }

  async categoryOverview(userId: string) {
    const [categoryCount, groups] = await this.database.$transaction(
      [
        this.database.category.count({ where: { userId } }),
        this.database.transaction.groupBy({
          by: ['categoryId', 'type'],
          where: { userId },
          _sum: { amountInCents: true },
          _count: { _all: true },
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    const categorySummaries = summarize(groups);
    return {
      categoryCount,
      transactionCount: categorySummaries.reduce(
        (sum, item) => sum + item.transactionCount,
        0,
      ),
      categorySummaries,
    };
  }
}

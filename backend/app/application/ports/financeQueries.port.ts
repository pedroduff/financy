import type { TransactionType } from '../../domain/entities/transaction.entity.js';

export type TransactionFilters = {
  userId: string;
  page: number;
  pageSize: number;
  search?: string | undefined;
  type?: TransactionType | undefined;
  categoryId?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
};

type TransactionRow = {
  id: string;
  categoryId: string;
  description: string;
  amountInCents: string;
  type: TransactionType;
  date: string;
};

type CategorySummary = {
  categoryId: string;
  transactionCount: number;
  incomeInCents: string;
  expenseInCents: string;
};

export interface FinanceQueries {
  listTransactions: (filters: TransactionFilters) => Promise<{
    items: TransactionRow[];
    totalCount: number;
    page: number;
    pageSize: number;
  }>;
  dashboard: (
    userId: string,
    startDate: string,
    endDate: string,
  ) => Promise<{
    incomeInCents: string;
    expenseInCents: string;
    balanceInCents: string;
    transactionCount: number;
    recentTransactions: TransactionRow[];
    categorySummaries: CategorySummary[];
  }>;
  categoryOverview: (userId: string) => Promise<{
    categoryCount: number;
    transactionCount: number;
    categorySummaries: CategorySummary[];
  }>;
}

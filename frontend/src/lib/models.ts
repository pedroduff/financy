export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  avatarVersion: number;
};
export type Category = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
};
export type Transaction = {
  id: string;
  categoryId: string;
  description: string;
  amountInCents: string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
};
type CategorySummary = {
  categoryId: string;
  transactionCount: number;
  incomeInCents: string;
  expenseInCents: string;
};
export type CategoryData = {
  categories: Category[];
  categoryOverview: {
    categoryCount: number;
    transactionCount: number;
    categorySummaries: CategorySummary[];
  };
};
export type DashboardData = {
  dashboard: {
    incomeInCents: string;
    expenseInCents: string;
    balanceInCents: string;
    transactionCount: number;
    recentTransactions: Transaction[];
    categorySummaries: CategorySummary[];
  };
};
export type TransactionPage = {
  transactions: {
    items: Transaction[];
    totalCount: number;
    page: number;
    pageSize: number;
  };
};
export type Period = { startDate: string; endDate: string };

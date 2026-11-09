import { useQuery } from '@tanstack/react-query';
import { graphql } from '../../lib/graphql';
import type {
  CategoryData,
  DashboardData,
  Period,
  TransactionPage,
} from '../../lib/models';

const transactionFields = 'id categoryId description amountInCents type date';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) =>
      graphql<CategoryData>(
        '{categories{id name description icon color} categoryOverview{categoryCount transactionCount categorySummaries{categoryId transactionCount incomeInCents expenseInCents}}}',
        {},
        signal,
      ),
  });
}

export function useDashboard(period: Period) {
  return useQuery({
    queryKey: ['dashboard', period],
    queryFn: ({ signal }) =>
      graphql<DashboardData>(
        `query($startDate:String!,$endDate:String!){dashboard(startDate:$startDate,endDate:$endDate){incomeInCents expenseInCents balanceInCents transactionCount recentTransactions{${transactionFields}} categorySummaries{categoryId transactionCount incomeInCents expenseInCents}}}`,
        period,
        signal,
      ),
  });
}

export type Filters = Period & {
  page: number;
  pageSize: number;
  search: string;
  type: string;
  categoryId: string;
};

export function useTransactions(filters: Filters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: ({ signal }) =>
      graphql<TransactionPage>(
        `query($filters:TransactionFilters){transactions(filters:$filters){items{${transactionFields}} totalCount page pageSize}}`,
        {
          filters: {
            ...filters,
            type: filters.type || null,
            categoryId: filters.categoryId || null,
          },
        },
        signal,
      ),
  });
}

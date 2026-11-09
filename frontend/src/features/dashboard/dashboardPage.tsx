import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { AssetIcon } from '../../components/ui/icon';
import { EmptyState, ErrorState, Loading } from '../../components/ui/states';
import { assets } from '../../lib/assets';
import { formatMoney } from '../../lib/format';
import { useFinanceDialogs } from '../finance/dialogs';
import { useCategories, useDashboard } from '../finance/hooks';
import { PeriodSelector, usePeriod } from '../finance/period';
import { TransactionTable } from '../transactions/transactionTable';

export function DashboardPage() {
  const { period } = usePeriod();
  const data = useDashboard(period);
  const categories = useCategories();
  const dialogs = useFinanceDialogs();
  return (
    <main className="page-content dashboard-page">
      <div className="dashboard-period">
        <div>
          <h1 className="sr-only">Dashboard</h1>
          <p className="period-caption">Acompanhe suas finanças por período</p>
        </div>
        <PeriodSelector />
      </div>
      {data.isPending || categories.isPending ? (
        <Loading />
      ) : data.isError ? (
        <ErrorState
          error={data.error}
          retry={() => {
            void data.refetch();
          }}
        />
      ) : categories.isError ? (
        <ErrorState
          error={categories.error}
          retry={() => {
            void categories.refetch();
          }}
        />
      ) : (
        <>
          <section className="stat-grid" aria-label="Resumo financeiro">
            <div className="stat-card financial-stat">
              <div className="stat-label">
                <AssetIcon src={assets.dashboard.wallet} />
                <h2>Saldo do período</h2>
              </div>
              <strong>{formatMoney(data.data.dashboard.balanceInCents)}</strong>
            </div>
            <div className="stat-card financial-stat">
              <div className="stat-label">
                <AssetIcon src={assets.dashboard['circle-arrow-up']} />
                <h2>Receitas do período</h2>
              </div>
              <strong>{formatMoney(data.data.dashboard.incomeInCents)}</strong>
            </div>
            <div className="stat-card financial-stat">
              <div className="stat-label">
                <AssetIcon src={assets.dashboard['circle-arrow-down']} />
                <h2>Despesas do período</h2>
              </div>
              <strong>{formatMoney(data.data.dashboard.expenseInCents)}</strong>
            </div>
          </section>
          <div className="dashboard-grid">
            <section className="surface recent-transactions">
              <header className="panel-heading">
                <h2>Transações recentes</h2>
                <Link className="text-link" to="/transactions">
                  Ver todas
                  <AssetIcon src={assets.dashboard['chevron-right']} />
                </Link>
              </header>
              {data.data.dashboard.recentTransactions.length ? (
                <TransactionTable
                  compact
                  transactions={data.data.dashboard.recentTransactions}
                  categories={categories.data.categories}
                />
              ) : (
                <EmptyState
                  title="Nenhuma transação neste período"
                  description="Registre uma receita ou despesa para começar."
                />
              )}
              <footer className="panel-footer">
                <Button variant="link" onClick={() => dialogs.transaction()}>
                  <AssetIcon src={assets.dashboard.plus} />
                  Nova transação
                </Button>
              </footer>
            </section>
            <section className="surface category-panel">
              <header className="panel-heading">
                <h2>Categorias</h2>
                <Link className="text-link" to="/categories">
                  Gerenciar
                  <AssetIcon src={assets.dashboard['chevron-right']} />
                </Link>
              </header>
              {data.data.dashboard.categorySummaries.length ? (
                <ul className="category-summary-list">
                  {[...data.data.dashboard.categorySummaries]
                    .sort(
                      (left, right) =>
                        right.transactionCount - left.transactionCount ||
                        left.categoryId.localeCompare(right.categoryId),
                    )
                    .slice(0, 5)
                    .map((summary) => {
                      const category = categories.data.categories.find(
                        (item) => item.id === summary.categoryId,
                      );
                      return (
                        <li key={summary.categoryId}>
                          <span
                            className={`tag color-${category?.color ?? 'green'}`}
                          >
                            {category?.name}
                          </span>
                          <small>
                            {summary.transactionCount}{' '}
                            {summary.transactionCount === 1 ? 'item' : 'itens'}
                          </small>
                          <strong>
                            {formatMoney(
                              (
                                BigInt(summary.incomeInCents) -
                                BigInt(summary.expenseInCents)
                              ).toString(),
                            )}
                          </strong>
                        </li>
                      );
                    })}
                </ul>
              ) : (
                <EmptyState
                  title="Sem movimentações"
                  description="Os resumos por categoria aparecerão aqui."
                />
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}

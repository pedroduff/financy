import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Field, Select } from '../../components/ui/field';
import { AssetIcon } from '../../components/ui/icon';
import { EmptyState, ErrorState, Loading } from '../../components/ui/states';
import { assets } from '../../lib/assets';
import { useFinanceDialogs } from '../finance/dialogs';
import { useCategories, useTransactions } from '../finance/hooks';
import { PeriodSelector, usePeriod } from '../finance/period';
import { TransactionTable } from './transactionTable';

export function TransactionsPage() {
  const { period } = usePeriod();
  const dialogs = useFinanceDialogs();
  const categories = useCategories();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [type, setType] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [pageState, setPageState] = useState({ key: '', page: 1 });
  const filterKey = JSON.stringify({
    ...period,
    search: debouncedSearch,
    type,
    categoryId,
  });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const data = useTransactions({
    ...period,
    search: debouncedSearch,
    type,
    categoryId,
    page,
    pageSize: 10,
  });
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const totalPages = Math.max(
    1,
    Math.ceil((data.data?.transactions.totalCount ?? 0) / 10),
  );
  useEffect(() => {
    if (data.isSuccess && page > totalPages)
      setPageState({ key: filterKey, page: totalPages });
  }, [data.isSuccess, page, totalPages, filterKey]);
  return (
    <main className="page-content">
      <header className="page-heading">
        <div>
          <h1>Transações</h1>
          <p>Gerencie todas as suas transações financeiras</p>
        </div>
        <Button size="sm" onClick={() => dialogs.transaction()}>
          <AssetIcon src={assets.transactions.plus} />
          Nova transação
        </Button>
      </header>
      <section className="surface filters" aria-label="Filtros de transações">
        <Field
          label="Buscar"
          placeholder="Buscar por descrição"
          icon={assets.transactions.search}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          maxLength={200}
        />
        <Select
          label="Tipo"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="">Todos</option>
          <option value="INCOME">Entrada</option>
          <option value="EXPENSE">Saída</option>
        </Select>
        <Select
          label="Categoria"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="">Todas</option>
          {categories.data?.categories.map((category) => (
            <option value={category.id} key={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <PeriodSelector />
      </section>
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
        <section className="surface transaction-panel">
          {data.data.transactions.items.length ? (
            <TransactionTable
              transactions={data.data.transactions.items}
              categories={categories.data.categories}
            />
          ) : (
            <EmptyState
              title="Nenhuma transação encontrada"
              description="Ajuste os filtros ou registre uma receita ou despesa."
            >
              <Button variant="outline" onClick={() => dialogs.transaction()}>
                Nova transação
              </Button>
            </EmptyState>
          )}
          <footer className="pagination">
            <p>
              {data.data.transactions.totalCount
                ? `${(page - 1) * 10 + 1} a ${Math.min(page * 10, data.data.transactions.totalCount)}`
                : '0'}{' '}
              | {data.data.transactions.totalCount} resultados
            </p>
            <nav aria-label="Paginação">
              <Button
                variant="outline"
                size="icon"
                aria-label="Página anterior"
                disabled={page <= 1}
                onClick={() => setPageState({ key: filterKey, page: page - 1 })}
              >
                <AssetIcon src={assets.transactions['chevron-left']} />
              </Button>
              {Array.from(
                { length: Math.min(5, totalPages) },
                (_item, index) =>
                  Math.min(Math.max(1, page - 2), Math.max(1, totalPages - 4)) +
                  index,
              ).map((number) => (
                <Button
                  key={number}
                  variant={page === number ? 'primary' : 'outline'}
                  size="icon"
                  aria-label={`Página ${number}`}
                  aria-current={page === number ? 'page' : undefined}
                  onClick={() => setPageState({ key: filterKey, page: number })}
                >
                  {number}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                aria-label="Próxima página"
                disabled={page >= totalPages}
                onClick={() => setPageState({ key: filterKey, page: page + 1 })}
              >
                <AssetIcon src={assets.transactions['chevron-right']} />
              </Button>
            </nav>
          </footer>
        </section>
      )}
    </main>
  );
}

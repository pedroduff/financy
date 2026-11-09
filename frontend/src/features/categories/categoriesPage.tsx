import { Button } from '../../components/ui/button';
import { AssetIcon, CategoryIcon } from '../../components/ui/icon';
import { EmptyState, ErrorState, Loading } from '../../components/ui/states';
import { assets } from '../../lib/assets';
import { useFinanceDialogs } from '../finance/dialogs';
import { useCategories } from '../finance/hooks';

export function CategoriesPage() {
  const query = useCategories();
  const dialogs = useFinanceDialogs();
  if (query.isPending) return <Loading />;
  if (query.isError)
    return (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const { categories, categoryOverview } = query.data;
  const summaries = new Map(
    categoryOverview.categorySummaries.map((item) => [item.categoryId, item]),
  );
  const mostUsed = [...categories]
    .sort(
      (left, right) =>
        (summaries.get(right.id)?.transactionCount ?? 0) -
          (summaries.get(left.id)?.transactionCount ?? 0) ||
        left.name.localeCompare(right.name, 'pt-BR'),
    )
    .at(0);
  return (
    <main className="page-content">
      <header className="page-heading">
        <div>
          <h1>Categorias</h1>
          <p>Organize suas transações por categorias</p>
        </div>
        <Button size="sm" onClick={() => dialogs.category()}>
          <AssetIcon src={assets.categories.plus} />
          Nova categoria
        </Button>
      </header>
      <section
        className="stat-grid category-stats"
        aria-label="Resumo das categorias"
      >
        <div className="stat-card">
          <AssetIcon src={assets.categories.tag} />
          <div>
            <strong>{categoryOverview.categoryCount}</strong>
            <p>Total de categorias</p>
          </div>
        </div>
        <div className="stat-card">
          <AssetIcon src={assets.categories['arrow-up-down']} />
          <div>
            <strong>{categoryOverview.transactionCount}</strong>
            <p>Total de transações</p>
          </div>
        </div>
        <div className="stat-card">
          {mostUsed && categoryOverview.transactionCount > 0 ? (
            <CategoryIcon icon={mostUsed.icon} color={mostUsed.color} plain />
          ) : (
            <AssetIcon src={assets.categories.utensils} />
          )}
          <div>
            <strong>
              {categoryOverview.transactionCount > 0 ? mostUsed?.name : '—'}
            </strong>
            <p>Categoria mais utilizada</p>
          </div>
        </div>
      </section>
      {!categories.length ? (
        <section className="surface">
          <EmptyState
            title="Suas categorias começam aqui"
            description="Crie categorias para organizar suas receitas e despesas."
          >
            <Button onClick={() => dialogs.category()}>
              Criar primeira categoria
            </Button>
          </EmptyState>
        </section>
      ) : (
        <section className="category-grid" aria-label="Categorias cadastradas">
          {categories.map((category) => (
            <article className="category-card surface" key={category.id}>
              <div className="category-card-top">
                <CategoryIcon icon={category.icon} color={category.color} />
                <div className="row-actions">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Excluir categoria ${category.name}`}
                    onClick={() =>
                      dialogs.remove('category', category.id, category.name)
                    }
                  >
                    <AssetIcon src={assets.categories.trash} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Editar categoria ${category.name}`}
                    onClick={() => dialogs.category(category)}
                  >
                    <AssetIcon src={assets.categories['square-pen']} />
                  </Button>
                </div>
              </div>
              <div className="category-copy">
                <h2>{category.name}</h2>
                <p>{category.description || 'Sem descrição'}</p>
              </div>
              <div className="category-card-footer">
                <span className={`tag color-${category.color}`}>
                  {category.name}
                </span>
                <span>
                  {summaries.get(category.id)?.transactionCount ?? 0}{' '}
                  {(summaries.get(category.id)?.transactionCount ?? 0) === 1
                    ? 'item'
                    : 'itens'}
                </span>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

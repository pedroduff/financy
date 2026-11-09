import { Button } from '../../components/ui/button';
import { AssetIcon, CategoryIcon } from '../../components/ui/icon';
import { assets } from '../../lib/assets';
import { formatDate, formatMoney } from '../../lib/format';
import type { Category, Transaction } from '../../lib/models';
import { useFinanceDialogs } from '../finance/dialogs';

export function TransactionTable({
  transactions,
  categories,
  compact = false,
}: {
  transactions: Transaction[];
  categories: Category[];
  compact?: boolean;
}) {
  const dialogs = useFinanceDialogs();
  const byId = new Map(categories.map((category) => [category.id, category]));
  return (
    <div className={`table-scroll ${compact ? 'compact-table' : ''}`}>
      <table>
        {!compact && (
          <thead>
            <tr>
              <th scope="col">Descrição</th>
              <th scope="col">Data</th>
              <th scope="col">Categoria</th>
              <th scope="col">Tipo</th>
              <th scope="col" className="align-right">
                Valor
              </th>
              <th scope="col" className="align-right">
                Ações
              </th>
            </tr>
          </thead>
        )}
        <tbody>
          {transactions.map((transaction) => {
            const category = byId.get(transaction.categoryId);
            const income = transaction.type === 'INCOME';
            return (
              <tr key={transaction.id}>
                <td>
                  <div className="transaction-description">
                    <CategoryIcon
                      icon={category?.icon ?? 'receipt-text'}
                      color={category?.color ?? 'green'}
                    />
                    <div>
                      <span>{transaction.description}</span>
                      {compact && <small>{formatDate(transaction.date)}</small>}
                    </div>
                  </div>
                </td>
                {!compact && (
                  <td className="transaction-date">
                    {formatDate(transaction.date)}
                  </td>
                )}
                <td>
                  <span className={`tag color-${category?.color ?? 'green'}`}>
                    {category?.name ?? 'Categoria indisponível'}
                  </span>
                </td>
                {!compact && (
                  <td>
                    <span
                      className={`transaction-type ${income ? 'income' : 'expense'}`}
                    >
                      <AssetIcon
                        src={
                          income
                            ? assets.transactions['circle-arrow-up']
                            : assets.transactions['circle-arrow-down']
                        }
                      />
                      {income ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                )}
                <td className="align-right">
                  <span className="transaction-amount">
                    {income ? '+' : '−'}{' '}
                    {formatMoney(transaction.amountInCents)}
                    {compact && (
                      <AssetIcon
                        src={
                          income
                            ? assets.dashboard['circle-arrow-up1']
                            : assets.dashboard['circle-arrow-down1']
                        }
                      />
                    )}
                  </span>
                </td>
                {!compact && (
                  <td>
                    <div className="row-actions justify-end">
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Excluir transação ${transaction.description}`}
                        onClick={() =>
                          dialogs.remove(
                            'transaction',
                            transaction.id,
                            transaction.description,
                          )
                        }
                      >
                        <AssetIcon src={assets.transactions.trash} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Editar transação ${transaction.description}`}
                        onClick={() => dialogs.transaction(transaction)}
                      >
                        <AssetIcon src={assets.transactions['square-pen']} />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

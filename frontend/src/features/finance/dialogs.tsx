import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { refreshFinances, useFeedback } from '../../app/providers';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/dialog';
import { Field, Select } from '../../components/ui/field';
import { AssetIcon, iconOptions } from '../../components/ui/icon';
import {
  EmptyState,
  ErrorMessage,
  ErrorState,
  Loading,
} from '../../components/ui/states';
import { assets } from '../../lib/assets';
import { localDate, moneyInput, parseMoney } from '../../lib/format';
import { graphql } from '../../lib/graphql';
import type { Category, Transaction } from '../../lib/models';
import { useCategories } from './hooks';

const colorOptions = [
  ['green', 'Verde'],
  ['blue', 'Azul'],
  ['purple', 'Roxo'],
  ['pink', 'Rosa'],
  ['red', 'Vermelho'],
  ['orange', 'Laranja'],
  ['yellow', 'Amarelo'],
] as const;
const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o título.')
    .max(100, 'Use até 100 caracteres.'),
  description: z.string().max(500, 'Use até 500 caracteres.'),
  icon: z.string().min(1),
  color: z.string().min(1),
});
const transactionSchema = z.object({
  categoryId: z.string().min(1, 'Selecione uma categoria.'),
  description: z.string().trim().min(1, 'Informe a descrição.').max(500),
  amount: z.string().refine((value) => {
    try {
      parseMoney(value);
      return true;
    } catch {
      return false;
    }
  }, 'Informe um valor positivo, como 150,00.'),
  type: z.enum(['INCOME', 'EXPENSE']),
  date: z.iso.date('Informe uma data válida.'),
});

type DialogState =
  | { kind: 'category'; item?: Category }
  | { kind: 'transaction'; item?: Transaction }
  | {
      kind: 'delete';
      resource: 'category' | 'transaction';
      id: string;
      name: string;
    };
type DialogActions = {
  category: (item?: Category) => void;
  transaction: (item?: Transaction) => void;
  remove: (
    resource: 'category' | 'transaction',
    id: string,
    name: string,
  ) => void;
};
const Context = createContext<DialogActions | null>(null);

export function FinanceDialogs({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const close = () => setDialog(null);
  return (
    <Context
      value={{
        category: (item) => setDialog({ kind: 'category', item }),
        transaction: (item) => setDialog({ kind: 'transaction', item }),
        remove: (resource, id, name) =>
          setDialog({ kind: 'delete', resource, id, name }),
      }}
    >
      {children}
      {dialog?.kind === 'category' && (
        <CategoryForm item={dialog.item} onClose={close} />
      )}
      {dialog?.kind === 'transaction' && (
        <TransactionForm item={dialog.item} onClose={close} />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteDialog dialog={dialog} onClose={close} />
      )}
    </Context>
  );
}

export function useFinanceDialogs() {
  const context = useContext(Context);
  if (!context) throw new Error('FinanceDialogs ausente.');
  return context;
}

function CategoryForm({
  item,
  onClose,
}: {
  item?: Category | undefined;
  onClose: () => void;
}) {
  const notify = useFeedback();
  const form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: item?.name ?? '',
      description: item?.description ?? '',
      icon: item?.icon ?? 'briefcase-business',
      color: item?.color ?? 'green',
    },
  });
  const save = useMutation({
    mutationFn: (input: z.infer<typeof categorySchema>) =>
      graphql(
        item
          ? 'mutation($id:ID!,$input:CategoryInput!){updateCategory(id:$id,input:$input){id}}'
          : 'mutation($input:CategoryInput!){createCategory(input:$input){id}}',
        { id: item?.id, input },
      ),
    onSuccess: async () => {
      await refreshFinances();
      notify(item ? 'Categoria atualizada.' : 'Categoria criada.');
      onClose();
    },
  });
  const selectedIcon = form.watch('icon');
  const selectedColor = form.watch('color');
  return (
    <Modal
      title={item ? 'Editar categoria' : 'Nova categoria'}
      description="Organize suas transações com categorias"
      onClose={onClose}
      busy={save.isPending}
    >
      <form
        className="form-stack"
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
        noValidate
      >
        <div className="fields-stack">
          <Field
            label="Título"
            placeholder="Ex. Alimentação"
            maxLength={100}
            {...form.register('name')}
            error={form.formState.errors.name?.message}
          />
          <Field
            label="Descrição"
            placeholder="Descrição da categoria"
            hint="Opcional"
            maxLength={500}
            {...form.register('description')}
            error={form.formState.errors.description?.message}
          />
          <fieldset className="choice-field">
            <legend>Ícone</legend>
            <div className="icon-choices">
              {iconOptions.map(([icon, label]) => (
                <button
                  key={icon}
                  type="button"
                  className={`icon-choice ${selectedIcon === icon ? 'selected' : ''}`}
                  aria-label={label}
                  aria-pressed={selectedIcon === icon}
                  onClick={() => form.setValue('icon', icon)}
                >
                  <AssetIcon src={assets.categoryDialog[icon]} />
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="choice-field">
            <legend>Cor</legend>
            <div className="color-choices">
              {colorOptions.map(([color, label]) => (
                <button
                  key={color}
                  type="button"
                  className={`color-choice color-${color} ${selectedColor === color ? 'selected' : ''}`}
                  aria-label={label}
                  aria-pressed={selectedColor === color}
                  onClick={() => form.setValue('color', color)}
                >
                  <span />
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <ErrorMessage error={save.error} />
        <Button type="submit" className="full-width" disabled={save.isPending}>
          {save.isPending ? 'Salvando…' : 'Salvar'}
        </Button>
      </form>
    </Modal>
  );
}

function TransactionForm({
  item,
  onClose,
}: {
  item?: Transaction | undefined;
  onClose: () => void;
}) {
  const categories = useCategories();
  const notify = useFeedback();
  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: item?.description ?? '',
      categoryId: item?.categoryId ?? '',
      amount: item ? moneyInput(item.amountInCents) : '',
      type: item?.type ?? 'EXPENSE',
      date: item?.date ?? localDate(),
    },
  });
  const save = useMutation({
    mutationFn: (values: z.infer<typeof transactionSchema>) => {
      const { amount, ...input } = values;
      return graphql(
        item
          ? 'mutation($id:ID!,$input:TransactionInput!){updateTransaction(id:$id,input:$input){id}}'
          : 'mutation($input:TransactionInput!){createTransaction(input:$input){id}}',
        {
          id: item?.id,
          input: { ...input, amountInCents: parseMoney(amount) },
        },
      );
    },
    onSuccess: async () => {
      await refreshFinances();
      notify(item ? 'Transação atualizada.' : 'Transação criada.');
      onClose();
    },
  });
  const type = form.watch('type');
  return (
    <Modal
      title={item ? 'Editar transação' : 'Nova transação'}
      description="Registre sua despesa ou receita"
      onClose={onClose}
      busy={save.isPending}
    >
      {categories.isPending ? (
        <Loading />
      ) : categories.isError ? (
        <ErrorState
          error={categories.error}
          retry={() => {
            void categories.refetch();
          }}
        />
      ) : !categories.data.categories.length ? (
        <EmptyState
          title="Crie sua primeira categoria"
          description="Toda transação precisa de uma categoria. Cadastre uma para continuar."
        >
          <Link
            className="button button-primary button-md"
            to="/categories"
            onClick={onClose}
          >
            Ir para categorias
          </Link>
        </EmptyState>
      ) : (
        <form
          className="form-stack"
          onSubmit={form.handleSubmit((values) => save.mutate(values))}
          noValidate
        >
          <fieldset className="transaction-types">
            <legend className="sr-only">Tipo de transação</legend>
            <button
              type="button"
              className={type === 'EXPENSE' ? 'selected expense' : ''}
              aria-pressed={type === 'EXPENSE'}
              onClick={() => form.setValue('type', 'EXPENSE')}
            >
              <AssetIcon src={assets.transactionDialog['circle-arrow-down']} />
              Despesa
            </button>
            <button
              type="button"
              className={type === 'INCOME' ? 'selected income' : ''}
              aria-pressed={type === 'INCOME'}
              onClick={() => form.setValue('type', 'INCOME')}
            >
              <AssetIcon src={assets.dashboard['circle-arrow-up1']} />
              Receita
            </button>
          </fieldset>
          <div className="fields-stack">
            <Field
              label="Descrição"
              placeholder="Ex. Almoço no restaurante"
              maxLength={500}
              {...form.register('description')}
              error={form.formState.errors.description?.message}
            />
            <div className="form-row">
              <Field
                label="Data"
                type="date"
                {...form.register('date')}
                error={form.formState.errors.date?.message}
              />
              <Field
                label="Valor"
                inputMode="decimal"
                placeholder="0,00"
                icon={assets.transactionDialog.currency}
                {...form.register('amount')}
                error={form.formState.errors.amount?.message}
              />
            </div>
            <Select
              label="Categoria"
              {...form.register('categoryId')}
              error={form.formState.errors.categoryId?.message}
            >
              <option value="">Selecione</option>
              {categories.data.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>

          <ErrorMessage error={save.error} />
          <Button
            type="submit"
            className="full-width"
            disabled={save.isPending}
          >
            {save.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </form>
      )}
    </Modal>
  );
}

function DeleteDialog({
  dialog,
  onClose,
}: {
  dialog: Extract<DialogState, { kind: 'delete' }>;
  onClose: () => void;
}) {
  const notify = useFeedback();
  const remove = useMutation({
    mutationFn: () =>
      graphql(
        dialog.resource === 'category'
          ? 'mutation($id:ID!){deleteCategory(id:$id){id}}'
          : 'mutation($id:ID!){deleteTransaction(id:$id){id}}',
        { id: dialog.id },
      ),
    onSuccess: async () => {
      await refreshFinances();
      notify('Registro excluído.');
      onClose();
    },
  });
  return (
    <Modal
      title={
        dialog.resource === 'category'
          ? 'Excluir categoria'
          : 'Excluir transação'
      }
      description={`Deseja excluir “${dialog.name}”? Essa ação não pode ser desfeita.`}
      onClose={onClose}
      busy={remove.isPending}
    >
      {dialog.resource === 'category' && (
        <p className="muted">
          Categorias com transações só podem ser excluídas depois de mover ou
          excluir seus lançamentos.
        </p>
      )}
      <ErrorMessage error={remove.error} />
      <div className="dialog-actions">
        <Button variant="outline" disabled={remove.isPending} onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
        >
          {remove.isPending ? 'Excluindo…' : 'Confirmar exclusão'}
        </Button>
      </div>
    </Modal>
  );
}

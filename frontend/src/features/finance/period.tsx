import { createContext, type ReactNode, useContext, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Field, Select } from '../../components/ui/field';
import { AssetIcon } from '../../components/ui/icon';
import { assets } from '../../lib/assets';
import { monthPeriod } from '../../lib/format';
import type { Period } from '../../lib/models';

const Context = createContext<{
  period: Period;
  setPeriod: (period: Period) => void;
} | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState(() => monthPeriod());
  return <Context value={{ period, setPeriod }}>{children}</Context>;
}

export function usePeriod() {
  const context = useContext(Context);
  if (!context) throw new Error('PeriodProvider ausente.');
  return context;
}

export function PeriodSelector() {
  const { period, setPeriod } = usePeriod();
  const [custom, setCustom] = useState(() => {
    const standard = monthPeriod(new Date(`${period.startDate}T12:00:00`));
    return (
      period.startDate !== standard.startDate ||
      period.endDate !== standard.endDate
    );
  });
  const [draft, setDraft] = useState(period);
  const [error, setError] = useState('');
  const selected = new Date(`${period.startDate}T12:00:00`);
  const month = period.startDate.slice(0, 7);
  const options = Array.from({ length: 25 }, (_value, index) => {
    const date = new Date(
      selected.getFullYear(),
      selected.getMonth() + index - 12,
      1,
    );
    return {
      value: monthPeriod(date).startDate.slice(0, 7),
      label: new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric',
      }).format(date),
    };
  });
  function shift(offset: number) {
    setCustom(false);
    setPeriod(
      monthPeriod(
        new Date(selected.getFullYear(), selected.getMonth() + offset, 1),
      ),
    );
  }
  return (
    <div className="period-selector">
      <div className="period-month">
        <Button
          variant="outline"
          size="icon"
          aria-label="Mês anterior"
          onClick={() => shift(-1)}
        >
          <AssetIcon src={assets.transactions['chevron-left']} />
        </Button>
        <Select
          label="Período"
          value={custom ? 'custom' : month}
          onChange={(event) => {
            if (event.target.value === 'custom') {
              setDraft(period);
              setCustom(true);
            } else {
              setCustom(false);
              setPeriod(
                monthPeriod(new Date(`${event.target.value}-01T12:00:00`)),
              );
            }
          }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          <option value="custom">Intervalo personalizado</option>
        </Select>
        <Button
          variant="outline"
          size="icon"
          aria-label="Próximo mês"
          onClick={() => shift(1)}
        >
          <AssetIcon src={assets.transactions['chevron-right']} />
        </Button>
      </div>
      {custom && (
        <form
          className="custom-period"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              !draft.startDate ||
              !draft.endDate ||
              draft.startDate > draft.endDate
            ) {
              setError('Informe um intervalo válido.');
              return;
            }
            setError('');
            setPeriod(draft);
          }}
        >
          <Field
            label="Data inicial"
            type="date"
            value={draft.startDate}
            required
            onChange={(event) =>
              setDraft({ ...draft, startDate: event.target.value })
            }
          />
          <Field
            label="Data final"
            type="date"
            value={draft.endDate}
            required
            min={draft.startDate}
            onChange={(event) =>
              setDraft({ ...draft, endDate: event.target.value })
            }
          />
          <Button type="submit" size="sm">
            Aplicar
          </Button>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

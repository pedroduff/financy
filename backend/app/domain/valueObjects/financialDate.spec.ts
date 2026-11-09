import { DomainError } from '../errors/domain.error.js';
import { FinancialDate, FinancialPeriod } from './financialDate.valueObject.js';

describe('FinancialDate', () => {
  it.each([
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '0000-01-01',
    '2026-1-01',
  ])('rejects an invalid calendar date: %s', (value) => {
    expect(() => new FinancialDate(value)).toThrow(DomainError);
  });

  it('accepts leap days and future dates without converting time zones', () => {
    expect(new FinancialDate('2028-02-29').value).toBe('2028-02-29');
    expect(new FinancialDate('2099-12-31').value).toBe('2099-12-31');
  });
});

describe('FinancialPeriod', () => {
  const period = new FinancialPeriod(
    new FinancialDate('2099-12-01'),
    new FinancialDate('2099-12-31'),
  );

  it('includes future dates and both interval boundaries', () => {
    expect(period.includes(new FinancialDate('2099-12-01'))).toBe(true);
    expect(period.includes(new FinancialDate('2099-12-15'))).toBe(true);
    expect(period.includes(new FinancialDate('2099-12-31'))).toBe(true);
    expect(period.includes(new FinancialDate('2099-11-30'))).toBe(false);
    expect(period.includes(new FinancialDate('2100-01-01'))).toBe(false);
  });

  it('rejects reversed intervals', () => {
    expect(() => new FinancialPeriod(period.end, period.start)).toThrow(
      DomainError,
    );
  });
});

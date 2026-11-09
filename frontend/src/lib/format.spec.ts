import { formatMoney, moneyInput, monthPeriod, parseMoney } from './format';

describe('BRL amounts', () => {
  it('parses Brazilian currency input without floating point rounding', () => {
    expect(parseMoney('1.234,56')).toBe('123456');
    expect(parseMoney('0,01')).toBe('1');
    expect(parseMoney('90071992547409,93')).toBe('9007199254740993');
    expect(moneyInput('9007199254740993')).toBe('90071992547409,93');
    expect(formatMoney('-123456')).toBe('- R$ 1.234,56');
  });
  it.each([
    '0',
    '-1,00',
    '1,999',
    '1.50',
    '1e3',
    '',
    '99999999999999999999999',
  ])('rejects invalid amount %s', (value) => {
    expect(() => parseMoney(value)).toThrow();
  });
});

it('handles leap years and end-of-year calendar boundaries', () => {
  expect(monthPeriod(new Date(2028, 1, 15))).toEqual({
    startDate: '2028-02-01',
    endDate: '2028-02-29',
  });
  expect(monthPeriod(new Date(2026, 11, 31))).toEqual({
    startDate: '2026-12-01',
    endDate: '2026-12-31',
  });
});

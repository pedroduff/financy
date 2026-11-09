import { DomainError } from '../errors/domain.error.js';
import { Money } from './money.valueObject.js';

describe('Money', () => {
  it('preserves integer precision beyond JavaScript number limits', () => {
    expect(new Money('9007199254740993').cents).toBe(9007199254740993n);
  });

  it.each(['0', '-1', '1.5', '1e3', '', ' 100', '01', 'NaN'])(
    'rejects invalid cent amounts: %s',
    (value) => {
      expect(() => new Money(value)).toThrow(DomainError);
    },
  );
});

import { DomainError } from '../errors/domain.error.js';
import { Email } from './email.valueObject.js';

describe('Email', () => {
  it('normalizes whitespace and case for identity comparison', () => {
    expect(
      new Email('  Conta@EXAMPLE.com ').equals(new Email('conta@example.com')),
    ).toBe(true);
  });

  it.each(['', 'invalid', 'a@@example.com', 'a b@example.com'])(
    'rejects invalid email: %s',
    (value) => {
      expect(() => new Email(value)).toThrow(DomainError);
    },
  );
});

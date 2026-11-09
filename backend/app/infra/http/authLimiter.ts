import { createHash } from 'node:crypto';
import { DomainError } from '../../domain/errors/domain.error.js';

export function createAuthLimiter() {
  const entries = new Map<string, { count: number; expiresAt: number }>();
  return (ip: string, identifier: string) => {
    const now = Date.now();
    for (const [key, value] of entries)
      if (value.expiresAt <= now) entries.delete(key);
    if (entries.size > 10_000) {
      throw new DomainError(
        'CONFLICT',
        'Muitas tentativas. Aguarde alguns minutos.',
      );
    }
    const accountKey = createHash('sha256')
      .update(identifier.trim().toLowerCase())
      .digest('hex');
    for (const [key, limit] of [
      [`ip:${ip}`, 30],
      [`account:${accountKey}`, 10],
    ] as const) {
      const value = entries.get(key) ?? {
        count: 0,
        expiresAt: now + 15 * 60 * 1000,
      };
      value.count += 1;
      entries.set(key, value);
      if (value.count > limit)
        throw new DomainError(
          'CONFLICT',
          'Muitas tentativas. Aguarde alguns minutos.',
        );
    }
  };
}

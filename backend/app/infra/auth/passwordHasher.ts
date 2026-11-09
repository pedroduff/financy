import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { PasswordHasher } from '../../application/ports/auth.port.js';

function derive(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}

export class ScryptPasswordHasher implements PasswordHasher {
  async hash(password: string) {
    const salt = randomBytes(16).toString('hex');
    const key = await derive(password, salt);
    return `scrypt$${salt}$${key.toString('hex')}`;
  }

  async verify(password: string, hash: string) {
    const parts = hash.split('$');
    const salt = parts.at(1);
    const encoded = parts.at(2);
    if (parts.at(0) !== 'scrypt' || !salt || !encoded) return false;
    const expected = Buffer.from(encoded, 'hex');
    const actual = await derive(password, salt);
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }
}

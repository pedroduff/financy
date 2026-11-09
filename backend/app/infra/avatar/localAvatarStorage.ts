import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { AvatarStorage } from '../../application/ports/avatar.port.js';

export class LocalAvatarStorage implements AvatarStorage {
  private readonly directory: string;

  constructor(directory: string) {
    this.directory = resolve(directory);
  }

  private path(key: string) {
    if (!/^[a-f0-9-]{36}\.webp$/.test(key))
      throw new Error('Invalid avatar storage key.');
    return join(this.directory, key);
  }

  async write(key: string, bytes: Uint8Array) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    await writeFile(this.path(key), bytes, { flag: 'wx', mode: 0o600 });
  }

  async read(key: string) {
    try {
      return await readFile(this.path(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async remove(key: string) {
    await rm(this.path(key), { force: true });
  }
}

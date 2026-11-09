import type { User } from '../../domain/entities/user.entity.js';

export const avatarMaxBytes = 5 * 1024 * 1024;

export interface AvatarStorage {
  write: (key: string, bytes: Uint8Array) => Promise<void>;
  read: (key: string) => Promise<Uint8Array | null>;
  remove: (key: string) => Promise<void>;
}

export interface AvatarProcessor {
  process: (bytes: Uint8Array, mime: string) => Promise<Uint8Array>;
}

export interface AvatarRepository {
  reserve: (key: string) => Promise<void>;
  abandon: (key: string) => Promise<void>;
  replace: (
    userId: string,
    expectedVersion: number,
    key: string | null,
  ) => Promise<User>;
}

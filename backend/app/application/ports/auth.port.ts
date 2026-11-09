import type { User } from '../../domain/entities/user.entity.js';

export type Account = { user: User; passwordHash: string };
export type SessionData = { id: string; userId: string; expiresAt: Date };

export interface AuthRepository {
  createAccount: (account: Account) => Promise<void>;
  findByEmail: (email: string) => Promise<Account | null>;
  findById: (id: string) => Promise<Account | null>;
  rename: (id: string, name: string) => Promise<void>;
  createSession: (session: SessionData, expectedHash: string) => Promise<void>;
  findSession: (id: string, userId: string, now: Date) => Promise<User | null>;
  deleteSession: (id: string, userId: string) => Promise<void>;
  changePassword: (
    id: string,
    expectedHash: string,
    hash: string,
  ) => Promise<void>;
  resetPassword: (tokenHash: string, hash: string, now: Date) => Promise<void>;
  enqueueReset: (email: string) => Promise<void>;
  saveResetToken: (
    id: string,
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    jobId: string,
  ) => Promise<boolean>;
}

export interface PasswordHasher {
  hash: (password: string) => Promise<string>;
  verify: (password: string, hash: string) => Promise<boolean>;
}

export interface SessionSigner {
  sign: (session: SessionData) => Promise<string>;
  verify: (token: string) => Promise<{ userId: string; sessionId: string }>;
}

export interface AccountMailer {
  sendReset: (email: string, token: string) => Promise<void>;
  sendPasswordChanged: (email: string) => Promise<void>;
}

export interface TokenGenerator {
  generate: () => string;
  digest: (value: string) => string;
}

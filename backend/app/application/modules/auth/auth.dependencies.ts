import type {
  AuthRepository,
  PasswordHasher,
  SessionSigner,
  TokenGenerator,
} from '../../ports/auth.port.js';
import type { IdGenerator } from '../../ports/idGenerator.port.js';

export type AuthDependencies = {
  repository: AuthRepository;
  passwords: PasswordHasher;
  sessions: SessionSigner;
  tokens: TokenGenerator;
  ids: IdGenerator;
  now: () => Date;
  dummyHash: string;
};

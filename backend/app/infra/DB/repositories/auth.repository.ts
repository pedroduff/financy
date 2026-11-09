import { randomUUID } from 'node:crypto';
import type {
  Account,
  AuthRepository,
  SessionData,
} from '../../../application/ports/auth.port.js';
import { User } from '../../../domain/entities/user.entity.js';
import { DomainError } from '../../../domain/errors/domain.error.js';
import { Email } from '../../../domain/valueObjects/email.valueObject.js';
import { EntityId } from '../../../domain/valueObjects/entityId.valueObject.js';
import type { Database } from '../client.js';
import { translateDatabaseError } from '../errors.js';
import type { User as UserRecord } from '../generated/client.js';

function toAccount(record: UserRecord) {
  return {
    user: new User(new EntityId(record.id), {
      name: record.name,
      email: new Email(record.email),
      avatarKey: record.avatarKey,
      avatarVersion: record.avatarVersion,
    }),
    passwordHash: record.passwordHash,
  };
}

const invalidSession = () =>
  new DomainError('UNAUTHENTICATED', 'Faça login para continuar.');
const invalidReset = () =>
  new DomainError(
    'VALIDATION_ERROR',
    'O link é inválido ou expirou. Solicite outro.',
  );

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly database: Database) {}

  async createAccount(account: Account) {
    try {
      await this.database.user.create({
        data: {
          id: account.user.id.value,
          name: account.user.name,
          email: account.user.email.value,
          passwordHash: account.passwordHash,
        },
      });
    } catch (error) {
      throw translateDatabaseError(error);
    }
  }

  async findByEmail(email: string) {
    const record = await this.database.user.findUnique({ where: { email } });
    return record ? toAccount(record) : null;
  }

  async findById(id: string) {
    const record = await this.database.user.findUnique({ where: { id } });
    return record ? toAccount(record) : null;
  }

  async rename(id: string, name: string) {
    await this.database.user.update({ where: { id }, data: { name } });
  }

  async createSession(session: SessionData, expectedHash: string) {
    await this.database.$transaction(async (tx) => {
      const current = await tx.user.update({
        where: { id: session.userId },
        data: { updatedAt: new Date() },
      });
      if (current.passwordHash !== expectedHash) throw invalidSession();
      await tx.session.create({ data: session });
    });
  }

  async findSession(id: string, userId: string, now: Date) {
    const session = await this.database.session.findFirst({
      where: { id, userId, expiresAt: { gt: now } },
      include: { user: true },
    });
    return session ? toAccount(session.user).user : null;
  }

  async deleteSession(id: string, userId: string) {
    await this.database.session.deleteMany({ where: { id, userId } });
  }

  async changePassword(id: string, expectedHash: string, passwordHash: string) {
    await this.database.$transaction(async (tx) => {
      const current = await tx.user.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
      if (current.passwordHash !== expectedHash) throw invalidSession();
      await tx.user.update({ where: { id }, data: { passwordHash } });
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.passwordReset.deleteMany({ where: { userId: id } });
      await tx.accountEmailJob.deleteMany({
        where: { email: current.email, kind: 'RESET' },
      });
      await tx.accountEmailJob.create({
        data: {
          id: randomUUID(),
          email: current.email,
          kind: 'PASSWORD_CHANGED',
        },
      });
    });
  }

  async resetPassword(tokenHash: string, passwordHash: string, now: Date) {
    const token = await this.database.passwordReset.findUnique({
      where: { tokenHash },
    });
    if (!token || token.expiresAt <= now) throw invalidReset();
    await this.database.$transaction(async (tx) => {
      const account = await tx.user.update({
        where: { id: token.userId },
        data: { updatedAt: new Date() },
      });
      const current = await tx.passwordReset.findUnique({
        where: { tokenHash },
      });
      if (!current || current.expiresAt <= now) throw invalidReset();
      await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash },
      });
      await tx.passwordReset.deleteMany({ where: { userId: token.userId } });
      await tx.session.deleteMany({ where: { userId: token.userId } });
      await tx.accountEmailJob.deleteMany({
        where: { email: account.email, kind: 'RESET' },
      });
      await tx.accountEmailJob.create({
        data: {
          id: randomUUID(),
          email: account.email,
          kind: 'PASSWORD_CHANGED',
        },
      });
    });
  }

  async enqueueReset(email: string) {
    await this.database.accountEmailJob.create({
      data: { id: randomUUID(), email, kind: 'RESET' },
    });
  }

  async saveResetToken(
    id: string,
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    jobId: string,
  ) {
    return this.database.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { updatedAt: new Date() },
      });
      if (!(await tx.accountEmailJob.findUnique({ where: { id: jobId } })))
        return false;
      await tx.passwordReset.deleteMany({ where: { userId } });
      await tx.passwordReset.create({
        data: { id, userId, tokenHash, expiresAt },
      });
      return true;
    });
  }
}

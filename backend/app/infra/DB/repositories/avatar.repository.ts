import type {
  AvatarRepository,
  AvatarStorage,
} from '../../../application/ports/avatar.port.js';
import { User } from '../../../domain/entities/user.entity.js';
import { DomainError } from '../../../domain/errors/domain.error.js';
import { Email } from '../../../domain/valueObjects/email.valueObject.js';
import { EntityId } from '../../../domain/valueObjects/entityId.valueObject.js';
import type { Database } from '../client.js';

const conflict = () =>
  new DomainError(
    'CONFLICT',
    'A foto foi alterada em outra operação. Confira o perfil e tente novamente.',
  );

export class PrismaAvatarRepository implements AvatarRepository {
  constructor(private readonly database: Database) {}

  async reserve(key: string) {
    await this.database.avatarFile.create({
      data: { key, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
  }

  async abandon(key: string) {
    await this.database.avatarFile.updateMany({
      where: { key, expiresAt: { not: null } },
      data: { expiresAt: new Date() },
    });
  }

  async replace(userId: string, expectedVersion: number, key: string | null) {
    return this.database.$transaction(async (tx) => {
      if (key) {
        const reserved = await tx.avatarFile.updateMany({
          where: { key, expiresAt: { gt: new Date() } },
          data: { expiresAt: null },
        });
        if (!reserved.count) throw conflict();
      }
      const previous = await tx.user.findUnique({ where: { id: userId } });
      if (!previous)
        throw new DomainError('UNAUTHENTICATED', 'Faça login para continuar.');
      if (previous.avatarVersion !== expectedVersion) throw conflict();
      const changed = await tx.user.updateMany({
        where: { id: userId, avatarVersion: expectedVersion },
        data: { avatarKey: key, avatarVersion: { increment: 1 } },
      });
      if (!changed.count) throw conflict();
      if (previous.avatarKey)
        await tx.avatarFile.update({
          where: { key: previous.avatarKey },
          data: { expiresAt: new Date() },
        });
      const current = await tx.user.findUniqueOrThrow({
        where: { id: userId },
      });
      return new User(new EntityId(current.id), {
        name: current.name,
        email: new Email(current.email),
        avatarKey: current.avatarKey,
        avatarVersion: current.avatarVersion,
      });
    });
  }

  async cleanExpired(storage: AvatarStorage) {
    await this.database.$transaction(async (tx) => {
      const files = await tx.$queryRaw<{ key: string }[]>`
        SELECT "key" FROM "AvatarFile"
        WHERE "expiresAt" <= NOW()
        ORDER BY "expiresAt" ASC FOR UPDATE SKIP LOCKED LIMIT 20
      `;
      for (const file of files) {
        await storage.remove(file.key);
        await tx.avatarFile.delete({ where: { key: file.key } });
      }
    });
  }
}

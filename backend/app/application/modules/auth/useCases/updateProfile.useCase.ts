import { DomainError } from '../../../../domain/errors/domain.error.js';
import type { AuthDependencies } from '../auth.dependencies.js';
import { toUserDto } from '../mappers/user.mapper.js';

export class UpdateProfile {
  constructor(private readonly dependencies: AuthDependencies) {}

  async execute(input: { userId: string; name: string }) {
    const account = await this.dependencies.repository.findById(input.userId);
    if (!account)
      throw new DomainError('UNAUTHENTICATED', 'Faça login para continuar.');
    account.user.rename(input.name);
    await this.dependencies.repository.rename(input.userId, account.user.name);
    return toUserDto(account.user);
  }
}

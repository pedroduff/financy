import { DomainError } from '../../../../domain/errors/domain.error.js';
import { validatePassword } from '../../../../domain/valueObjects/password.valueObject.js';
import type { AuthDependencies } from '../auth.dependencies.js';

export class ChangePassword {
  constructor(private readonly dependencies: AuthDependencies) {}

  async execute(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }) {
    validatePassword(input.newPassword);
    const account = await this.dependencies.repository.findById(input.userId);
    if (
      !account ||
      !(await this.dependencies.passwords.verify(
        input.currentPassword,
        account.passwordHash,
      ))
    ) {
      throw new DomainError(
        'VALIDATION_ERROR',
        'A senha atual está incorreta.',
      );
    }
    const hash = await this.dependencies.passwords.hash(input.newPassword);
    await this.dependencies.repository.changePassword(
      input.userId,
      account.passwordHash,
      hash,
    );
    return true;
  }
}

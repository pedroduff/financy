import { validatePassword } from '../../../../domain/valueObjects/password.valueObject.js';
import type { AuthDependencies } from '../auth.dependencies.js';

export class ResetPassword {
  constructor(private readonly dependencies: AuthDependencies) {}

  async execute(input: { token: string; newPassword: string }) {
    validatePassword(input.newPassword);
    const hash = await this.dependencies.passwords.hash(input.newPassword);
    await this.dependencies.repository.resetPassword(
      this.dependencies.tokens.digest(input.token),
      hash,
      this.dependencies.now(),
    );
    return true;
  }
}

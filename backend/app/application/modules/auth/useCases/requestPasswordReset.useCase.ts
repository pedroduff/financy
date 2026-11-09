import { Email } from '../../../../domain/valueObjects/email.valueObject.js';
import type { AuthDependencies } from '../auth.dependencies.js';

export class RequestPasswordReset {
  constructor(private readonly dependencies: AuthDependencies) {}

  async execute(input: { email: string }) {
    await this.dependencies.repository.enqueueReset(
      new Email(input.email).value,
    );
    return true;
  }
}

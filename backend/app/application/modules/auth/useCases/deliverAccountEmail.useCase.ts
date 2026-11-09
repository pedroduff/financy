import type { AccountMailer } from '../../../ports/auth.port.js';
import type { AuthDependencies } from '../auth.dependencies.js';

export class DeliverAccountEmail {
  constructor(
    private readonly dependencies: AuthDependencies,
    private readonly mailer: AccountMailer,
  ) {}

  async execute(input: { id: string; email: string; kind: string }) {
    if (input.kind === 'PASSWORD_CHANGED') {
      await this.mailer.sendPasswordChanged(input.email);
      return;
    }
    const account = await this.dependencies.repository.findByEmail(input.email);
    if (!account) return;
    const token = this.dependencies.tokens.generate();
    const saved = await this.dependencies.repository.saveResetToken(
      this.dependencies.ids.generate(),
      account.user.id.value,
      this.dependencies.tokens.digest(token),
      new Date(this.dependencies.now().getTime() + 30 * 60 * 1000),
      input.id,
    );
    if (saved) await this.mailer.sendReset(input.email, token);
  }
}

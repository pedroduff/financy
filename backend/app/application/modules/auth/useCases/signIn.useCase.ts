import { DomainError } from '../../../../domain/errors/domain.error.js';
import { Email } from '../../../../domain/valueObjects/email.valueObject.js';
import type { AuthDependencies } from '../auth.dependencies.js';
import { toUserDto } from '../mappers/user.mapper.js';

export class SignIn {
  constructor(private readonly dependencies: AuthDependencies) {}

  async execute(input: {
    email: string;
    password: string;
    rememberMe: boolean;
  }) {
    const account = await this.dependencies.repository.findByEmail(
      new Email(input.email).value,
    );
    const valid = await this.dependencies.passwords.verify(
      input.password,
      account?.passwordHash ?? this.dependencies.dummyHash,
    );
    if (!account || !valid) {
      throw new DomainError('UNAUTHENTICATED', 'E-mail ou senha inválidos.');
    }
    const lifetime = input.rememberMe ? 30 * 24 * 60 * 60 : 8 * 60 * 60;
    const session = {
      id: this.dependencies.ids.generate(),
      userId: account.user.id.value,
      expiresAt: new Date(this.dependencies.now().getTime() + lifetime * 1000),
    };
    await this.dependencies.repository.createSession(
      session,
      account.passwordHash,
    );
    return {
      user: toUserDto(account.user),
      token: await this.dependencies.sessions.sign(session),
      lifetime,
      rememberMe: input.rememberMe,
    };
  }
}

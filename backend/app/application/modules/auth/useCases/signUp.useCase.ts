import { User } from '../../../../domain/entities/user.entity.js';
import { Email } from '../../../../domain/valueObjects/email.valueObject.js';
import { EntityId } from '../../../../domain/valueObjects/entityId.valueObject.js';
import { validatePassword } from '../../../../domain/valueObjects/password.valueObject.js';
import type { AuthDependencies } from '../auth.dependencies.js';
import { toUserDto } from '../mappers/user.mapper.js';

export class SignUp {
  constructor(private readonly dependencies: AuthDependencies) {}

  async execute(input: { name: string; email: string; password: string }) {
    validatePassword(input.password);
    const user = new User(new EntityId(this.dependencies.ids.generate()), {
      name: input.name,
      email: new Email(input.email),
    });
    const passwordHash = await this.dependencies.passwords.hash(input.password);
    await this.dependencies.repository.createAccount({ user, passwordHash });
    return toUserDto(user);
  }
}

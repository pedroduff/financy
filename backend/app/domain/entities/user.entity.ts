import { DomainError } from '../errors/domain.error.js';
import type { Email } from '../valueObjects/email.valueObject.js';
import type { EntityId } from '../valueObjects/entityId.valueObject.js';
import { Entity } from './entity.js';

type UserProps = {
  name: string;
  email: Email;
  avatarKey?: string | null;
  avatarVersion?: number;
};

export class User extends Entity<UserProps> {
  constructor(id: EntityId, props: UserProps) {
    super(id, { ...props });
    this.rename(props.name);
  }

  get name() {
    return this.props.name;
  }

  get email() {
    return this.props.email;
  }

  get avatarKey() {
    return this.props.avatarKey ?? null;
  }

  get avatarVersion() {
    return this.props.avatarVersion ?? 0;
  }

  rename(name: string) {
    const normalized = name.trim();
    if (normalized.length === 0 || normalized.length > 100) {
      throw new DomainError(
        'VALIDATION_ERROR',
        'O nome deve ter entre 1 e 100 caracteres.',
      );
    }
    this.props.name = normalized;
  }
}

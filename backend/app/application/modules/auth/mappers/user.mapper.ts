import type { User } from '../../../../domain/entities/user.entity.js';

export function toUserDto(user: User) {
  return {
    id: user.id.value,
    name: user.name,
    email: user.email.value,
    avatarVersion: user.avatarVersion,
    avatarUrl: user.avatarKey
      ? `/me/avatar/${user.avatarVersion}?account=${user.id.value}`
      : null,
  };
}

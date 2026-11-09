import type { AvatarRepository } from '../../../ports/avatar.port.js';
import { toUserDto } from '../mappers/user.mapper.js';

export class RemoveAvatar {
  constructor(private readonly repository: AvatarRepository) {}

  async execute(input: { userId: string; expectedVersion: number }) {
    return toUserDto(
      await this.repository.replace(input.userId, input.expectedVersion, null),
    );
  }
}

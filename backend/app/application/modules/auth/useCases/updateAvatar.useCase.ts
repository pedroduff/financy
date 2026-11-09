import type {
  AvatarProcessor,
  AvatarRepository,
  AvatarStorage,
} from '../../../ports/avatar.port.js';
import type { IdGenerator } from '../../../ports/idGenerator.port.js';
import { toUserDto } from '../mappers/user.mapper.js';

export class UpdateAvatar {
  constructor(
    private readonly repository: AvatarRepository,
    private readonly storage: AvatarStorage,
    private readonly processor: AvatarProcessor,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: {
    userId: string;
    expectedVersion: number;
    bytes: Uint8Array;
    mime: string;
  }) {
    const bytes = await this.processor.process(input.bytes, input.mime);
    const key = `${this.ids.generate()}.webp`;
    await this.repository.reserve(key);
    try {
      await this.storage.write(key, bytes);
      const user = await this.repository.replace(
        input.userId,
        input.expectedVersion,
        key,
      );
      return toUserDto(user);
    } catch (error) {
      await this.repository.abandon(key).catch(() => undefined);
      throw error;
    }
  }
}

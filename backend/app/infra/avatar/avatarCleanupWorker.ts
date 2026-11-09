import type { AvatarStorage } from '../../application/ports/avatar.port.js';
import type { PrismaAvatarRepository } from '../DB/repositories/avatar.repository.js';

export class AvatarCleanupWorker {
  private timer: ReturnType<typeof setInterval> | undefined;
  private running: Promise<void> | undefined;

  constructor(
    private readonly repository: PrismaAvatarRepository,
    private readonly storage: AvatarStorage,
    private readonly onFailure: () => void,
  ) {}

  start() {
    this.timer = setInterval(() => void this.tick(), 30_000);
    this.timer.unref();
    void this.tick();
  }

  async tick() {
    if (this.running) return this.running;
    this.running = this.repository
      .cleanExpired(this.storage)
      .catch(() => this.onFailure());
    try {
      await this.running;
    } finally {
      this.running = undefined;
    }
  }

  async stop() {
    clearInterval(this.timer);
    await this.running;
  }
}

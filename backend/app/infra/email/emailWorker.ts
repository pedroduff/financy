import type { DeliverAccountEmail } from '../../application/modules/auth/useCases/deliverAccountEmail.useCase.js';
import type { Database } from '../DB/client.js';

type Job = { id: string; email: string; kind: string; attempts: number };

export class EmailWorker {
  private timer: ReturnType<typeof setInterval> | undefined;
  private running: Promise<void> | undefined;

  constructor(
    private readonly database: Database,
    private readonly deliver: DeliverAccountEmail,
    private readonly onFailure: () => void,
  ) {}

  start() {
    this.timer = setInterval(() => {
      void this.tick();
    }, 1000);
    this.timer.unref();
  }

  async tick() {
    if (this.running) return this.running;
    this.running = this.process().catch(() => {
      this.onFailure();
    });
    try {
      await this.running;
    } finally {
      this.running = undefined;
    }
  }

  private async process() {
    await this.database.accountEmailJob.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    const jobs = await this.database.$queryRaw<Job[]>`
      UPDATE "AccountEmailJob" SET "lockedAt" = NOW(), "attempts" = "attempts" + 1
      WHERE "id" = (
        SELECT "id" FROM "AccountEmailJob"
        WHERE "availableAt" <= NOW() AND ("lockedAt" IS NULL OR "lockedAt" < NOW() - INTERVAL '2 minutes')
        AND "attempts" < 5
        ORDER BY "createdAt" ASC FOR UPDATE SKIP LOCKED LIMIT 1
      ) RETURNING "id", "email", "kind", "attempts"
    `;
    const job = jobs.at(0);
    if (!job) return;
    try {
      await this.deliver.execute(job);
      await this.database.accountEmailJob.deleteMany({ where: { id: job.id } });
    } catch {
      await this.database.accountEmailJob.updateMany({
        where: { id: job.id },
        data: {
          lockedAt: null,
          availableAt: new Date(Date.now() + 30_000 * job.attempts),
        },
      });
      this.onFailure();
    }
  }

  async stop() {
    clearInterval(this.timer);
    await this.running;
  }
}

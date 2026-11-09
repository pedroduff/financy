import type { EntityId } from '../valueObjects/entityId.valueObject.js';

export abstract class Entity<Props> {
  constructor(
    public readonly id: EntityId,
    protected props: Props,
  ) {}

  equals(other: Entity<unknown>) {
    return this.constructor === other.constructor && this.id.equals(other.id);
  }
}

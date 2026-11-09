import { UpdateAvatar } from './updateAvatar.useCase.js';

describe('Avatar replacement failure recovery', () => {
  function fixture() {
    const repository = {
      reserve: vi.fn(async (_key: string) => undefined),
      abandon: vi.fn(async (_key: string) => undefined),
      replace: vi.fn(async () => {
        throw new Error('Database unavailable.');
      }),
    };
    const storage = {
      write: vi.fn(async (_key: string, _bytes: Uint8Array) => undefined),
      read: vi.fn(async () => null),
      remove: vi.fn(async () => undefined),
    };
    const processor = { process: vi.fn(async () => new Uint8Array([1, 2, 3])) };
    const useCase = new UpdateAvatar(repository, storage, processor, {
      generate: () => 'new-key',
    });
    return { repository, storage, processor, useCase };
  }
  const input = {
    userId: 'owner',
    expectedVersion: 1,
    bytes: new Uint8Array([1]),
    mime: 'image/png',
  };

  it('leaves a durable cleanup reservation if persistence or immediate scheduling fails', async () => {
    const { useCase, repository, storage } = fixture();
    repository.abandon.mockRejectedValueOnce(
      new Error('Database unavailable.'),
    );
    await expect(useCase.execute(input)).rejects.toThrow(
      'Database unavailable.',
    );
    expect(repository.reserve).toHaveBeenCalledWith('new-key.webp');
    expect(repository.abandon).toHaveBeenCalledWith('new-key.webp');
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('schedules partial writes for cleanup without publishing the new file', async () => {
    const { useCase, repository, storage } = fixture();
    storage.write.mockRejectedValueOnce(new Error('Disk unavailable.'));
    await expect(useCase.execute(input)).rejects.toThrow('Disk unavailable.');
    expect(repository.replace).not.toHaveBeenCalled();
    expect(repository.abandon).toHaveBeenCalledWith('new-key.webp');
  });

  it('does not reserve or store a rejected image', async () => {
    const { useCase, repository, storage, processor } = fixture();
    processor.process.mockRejectedValueOnce(new Error('Invalid image.'));
    await expect(useCase.execute(input)).rejects.toThrow('Invalid image.');
    expect(repository.reserve).not.toHaveBeenCalled();
    expect(storage.write).not.toHaveBeenCalled();
  });
});

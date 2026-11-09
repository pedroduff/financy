import sharp from 'sharp';
import { SharpAvatarProcessor } from './sharpAvatarProcessor.js';

describe('Avatar image processing', () => {
  const processor = new SharpAvatarProcessor();

  it.each(['jpeg', 'png', 'webp'] as const)(
    'normalizes %s to a square WebP without metadata',
    async (format) => {
      const source = await sharp({
        create: { width: 80, height: 40, channels: 3, background: '#008855' },
      })
        .withMetadata({ orientation: 6 })
        .toFormat(format)
        .toBuffer();
      const bytes = await processor.process(source, `image/${format}`);
      const metadata = await sharp(bytes).metadata();
      expect(metadata).toMatchObject({
        width: 256,
        height: 256,
        format: 'webp',
      });
      expect(metadata.exif).toBeUndefined();
      expect(metadata.orientation).toBeUndefined();
      expect(metadata.xmp).toBeUndefined();
    },
  );

  it('rejects mismatched types, corrupt files, unsupported formats and oversized images', async () => {
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: 'red' },
    })
      .png()
      .toBuffer();
    const oversized = await sharp({
      create: { width: 5001, height: 5000, channels: 3, background: 'red' },
    })
      .png()
      .toBuffer();
    const gif = await sharp(png).gif().toBuffer();
    for (const [bytes, mime] of [
      [png, 'image/jpeg'],
      [png.subarray(0, 30), 'image/png'],
      [
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>',
        ),
        'image/png',
      ],
      [gif, 'image/gif'],
      [oversized, 'image/png'],
      [Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png'],
    ] as const) {
      await expect(processor.process(bytes, mime)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      });
    }
  });

  it('rejects animated WebP images', async () => {
    const pixels = Buffer.from([
      ...Array(4).fill([255, 0, 0]).flat(),
      ...Array(4).fill([0, 255, 0]).flat(),
    ]);
    const animated = await sharp(pixels, {
      raw: { width: 2, height: 4, pageHeight: 2, channels: 3 },
    })
      .webp({ loop: 0, delay: [100, 100] })
      .toBuffer();
    expect((await sharp(animated, { animated: true }).metadata()).pages).toBe(
      2,
    );
    await expect(
      processor.process(animated, 'image/webp'),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});

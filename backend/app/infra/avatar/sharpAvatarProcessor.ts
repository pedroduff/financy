import sharp from 'sharp';
import {
  type AvatarProcessor,
  avatarMaxBytes,
} from '../../application/ports/avatar.port.js';
import { DomainError } from '../../domain/errors/domain.error.js';

const mimeByFormat: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export class SharpAvatarProcessor implements AvatarProcessor {
  async process(bytes: Uint8Array, mime: string) {
    if (!bytes.length || bytes.length > avatarMaxBytes)
      throw new DomainError(
        'VALIDATION_ERROR',
        'Escolha uma imagem de até 5 MiB.',
      );
    try {
      const buffer = Buffer.from(bytes);
      const format = buffer
        .subarray(0, 3)
        .equals(Buffer.from([0xff, 0xd8, 0xff]))
        ? 'jpeg'
        : buffer
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? 'png'
          : buffer.subarray(0, 4).toString() === 'RIFF' &&
              buffer.subarray(8, 12).toString() === 'WEBP'
            ? 'webp'
            : null;
      if (!format || mimeByFormat[format] !== mime)
        throw new Error('Unsupported image signature.');
      if (format === 'png') {
        for (let offset = 8; offset + 12 <= buffer.length; ) {
          if (buffer.subarray(offset + 4, offset + 8).toString() === 'acTL')
            throw new Error('Animated PNG is unsupported.');
          offset += 12 + buffer.readUInt32BE(offset);
        }
      }
      if (
        format === 'webp' &&
        buffer.subarray(12, 16).toString() === 'VP8X' &&
        (buffer.at(20) ?? 0) & 2
      )
        throw new Error('Animated WebP is unsupported.');
      const image = sharp(bytes, {
        limitInputPixels: 25_000_000,
        failOn: 'warning',
        animated: true,
      });
      const metadata = await image.metadata();
      if (metadata.format !== format || (metadata.pages ?? 1) !== 1)
        throw new Error('Unsupported image.');
      return await image
        .autoOrient()
        .resize(256, 256, { fit: 'cover', position: 'centre' })
        .webp({ quality: 85 })
        .timeout({ seconds: 10 })
        .toBuffer();
    } catch {
      throw new DomainError(
        'VALIDATION_ERROR',
        'Use uma imagem JPEG, PNG ou WebP estática válida, com até 25 milhões de pixels.',
      );
    }
  }
}

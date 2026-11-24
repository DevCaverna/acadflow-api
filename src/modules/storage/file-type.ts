import { extname } from 'node:path';
import sharp from 'sharp';

const MAX_PIXELS = 40_000_000;

const EXTENSIONS: Readonly<Record<string, readonly string[]>> = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
};

async function detectImageFormat(body: Buffer): Promise<string | undefined> {
  try {
    const { format } = await sharp(body, { limitInputPixels: MAX_PIXELS }).metadata();
    return format;
  } catch {
    return undefined;
  }
}

export async function detectAttachmentType({
  body,
  name,
}: {
  body: Buffer;
  name: string;
}): Promise<string | undefined> {
  const isPdf = body.subarray(0, 5).toString('latin1') === '%PDF-';
  const format = isPdf ? 'pdf' : await detectImageFormat(body);
  const type = Object.keys(EXTENSIONS).find((mime) => mime.endsWith(`/${format}`));
  return type && EXTENSIONS[type].includes(extname(name).toLowerCase()) ? type : undefined;
}

export async function createAvatar({ body }: { body: Buffer }): Promise<Buffer | undefined> {
  const format = await detectImageFormat(body);
  if (!format || !['png', 'jpeg', 'webp'].includes(format)) return undefined;
  try {
    return await sharp(body, { limitInputPixels: MAX_PIXELS })
      .rotate()
      .resize(256, 256, { fit: 'cover' })
      .webp()
      .toBuffer();
  } catch {
    return undefined;
  }
}

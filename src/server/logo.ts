import sharp from "sharp";
import { config } from "@/config";

/** Detects the image type from its first bytes; the file name and declared type are not trusted. */
export function sniffImageType(bytes: Uint8Array): "png" | "jpeg" | "webp" | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

export class LogoError extends Error {}

/** Validates an uploaded logo and returns it resized as PNG, which both browsers and the PDF can use. */
export async function processLogo(bytes: Uint8Array): Promise<Buffer> {
  if (bytes.length > config.logo.maxBytes)
    throw new LogoError("El logo no puede pesar más de 200 KB.");
  if (!sniffImageType(bytes)) throw new LogoError("El logo tiene que ser PNG, JPG o WebP.");
  try {
    const side = config.logo.maxSidePx;
    return await sharp(bytes, { limitInputPixels: 25_000_000 })
      .rotate()
      .resize(side, side, { fit: "inside", withoutEnlargement: true })
      .png({ palette: true, compressionLevel: 9 })
      .toBuffer();
  } catch {
    throw new LogoError("No pudimos leer la imagen del logo.");
  }
}

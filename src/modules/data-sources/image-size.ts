// Reads the pixel size of a project image from its bytes, so the owner never
// types scene image sizes. Supports the image types the site serves:
// PNG, JPEG, SVG and WebP. Returns undefined when the size cannot be read.
import type { ImageSize } from "@/modules/domain";

function pngSize(b: Buffer): ImageSize | undefined {
  // Signature (8 bytes), then the IHDR chunk: length (4), "IHDR" (4), width (4), height (4).
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47 || b.toString("ascii", 12, 16) !== "IHDR") return undefined;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

// Start-of-frame markers carry the size; C4 (DHT), C8 (JPG) and CC (DAC) share the range but do not.
const isStartOfFrame = (marker: number) => marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

function jpegSize(b: Buffer): ImageSize | undefined {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return undefined;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return undefined;
    const marker = b[i + 1];
    if (marker === 0xff) {
      i++; // fill byte
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2; // markers without a length
      continue;
    }
    if (isStartOfFrame(marker)) return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  return undefined;
}

function webpSize(b: Buffer): ImageSize | undefined {
  if (b.length < 30 || b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") return undefined;
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  return undefined;
}

/** A length attribute in user units (plain or px); percentages and other units do not count. */
function svgLength(tag: string, name: string): number | undefined {
  const match = new RegExp(`\\s${name}\\s*=\\s*["']\\s*([0-9.]+)\\s*(px)?\\s*["']`).exec(tag);
  const value = match ? Number(match[1]) : NaN;
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function svgSize(text: string): ImageSize | undefined {
  const tag = /<svg\b[^>]*>/i.exec(text)?.[0];
  if (!tag) return undefined;
  let width = svgLength(tag, "width");
  let height = svgLength(tag, "height");
  const viewBox = /\sviewBox\s*=\s*["']([^"']+)["']/.exec(tag)?.[1].trim().split(/[\s,]+/).map(Number);
  if (viewBox?.length === 4 && viewBox[2] > 0 && viewBox[3] > 0) {
    const [, , w, h] = viewBox;
    if (width === undefined && height === undefined) [width, height] = [w, h];
    else if (width === undefined) width = (height! * w) / h;
    else if (height === undefined) height = (width * h) / w;
  }
  return width && height ? { width: Math.round(width), height: Math.round(height) } : undefined;
}

/** The size of an image from its bytes and file extension (".png", ".jpg", ...), or undefined. */
export function readImageSize(bytes: Buffer, extension: string): ImageSize | undefined {
  const size = (() => {
    switch (extension.toLowerCase()) {
      case ".png":
        return pngSize(bytes);
      case ".jpg":
      case ".jpeg":
        return jpegSize(bytes);
      case ".webp":
        return webpSize(bytes);
      case ".svg":
        return svgSize(bytes.toString("utf8"));
      default:
        return undefined;
    }
  })();
  return size && size.width > 0 && size.height > 0 ? size : undefined;
}

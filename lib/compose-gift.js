import sharp from "sharp";
import { tgsToPng } from "./tgs-to-png.js";
import { downloadDocument } from "./download-file.js";

const SIZE = 512;

function detectFileType(buffer) {
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) return "tgs";
  if (buffer.slice(0, 4).toString() === "RIFF") return "webp";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "png";
  return "unknown";
}

async function toPngBuffer(fileBuffer, size = SIZE) {
  const type = detectFileType(fileBuffer);
  if (type === "tgs") {
    return await tgsToPng(fileBuffer, size);
  }
  return await sharp(fileBuffer).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

function hexToRgb(color) {
  return {
    r: (color >> 16) & 0xff,
    g: (color >> 8) & 0xff,
    b: color & 0xff,
  };
}

function makeGradientSvg(centerColor, edgeColor, size = SIZE) {
  const c = hexToRgb(centerColor);
  const e = hexToRgb(edgeColor);
  return Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="rgb(${c.r},${c.g},${c.b})"/>
          <stop offset="100%" stop-color="rgb(${e.r},${e.g},${e.b})"/>
        </radialGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size / 2}" fill="url(#g)"/>
    </svg>
  `);
}

export async function composeRegularGift(gift) {
  const { sticker, background } = gift;
  const stickerBuffer = await downloadDocument(sticker);
  const stickerPng = await toPngBuffer(stickerBuffer);
  const bgSvg = makeGradientSvg(background.center_color, background.edge_color);
  
  return await sharp(bgSvg)
    .composite([{ input: stickerPng, gravity: "center", blend: "over" }])
    .png()
    .toBuffer();
}

function parseAttributes(attributes) {
  const result = { model: null, pattern: null, backdrop: null };
  for (const attr of attributes) {
    if (attr._ === "starGiftAttributeModel") result.model = attr.model;
    else if (attr._ === "starGiftAttributePattern") result.pattern = attr.pattern;
    else if (attr._ === "starGiftAttributeBackdrop") result.backdrop = attr.backdrop;
  }
  return result;
}

export async function composeUniqueGift(gift) {
  const { model, pattern, backdrop } = parseAttributes(gift.attributes);
  const [backdropBuffer, patternBuffer, modelBuffer] = await Promise.all([
    downloadDocument(backdrop),
    downloadDocument(pattern),
    downloadDocument(model),
  ]);
  const [backdropPng, patternPng, modelPng] = await Promise.all([
    toPngBuffer(backdropBuffer),
    toPngBuffer(patternBuffer),
    toPngBuffer(modelBuffer),
  ]);
  
  return await sharp(backdropPng)
    .composite([
      { input: patternPng, blend: "multiply", gravity: "center" },
      { input: modelPng, gravity: "center", blend: "over" },
    ])
    .png()
    .toBuffer();
}

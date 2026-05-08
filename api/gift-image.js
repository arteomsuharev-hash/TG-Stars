// api/gift-image.js — Vercel Serverless Function
// Отдаёт реальное изображение подарка по ID
// GET /api/gift-image?id=123

import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

const apiId   = 35428941;
const apiHash = 'ba211e1b4b260186488fe154a6ed7585';
const SESSION = '1AgAOMTQ5LjE1NC4xNjcuNDEBu6AFlypebj02yFbir2nbQx9l7eKvXQNHiy+oo6sUKgMyb5xrf3JCVTapyianLZznaD4AbOdvN6z/KZ1SBZgS6J9uNUcwRVyOGxE88ion68H/6nML47mHeciTSyfCYHrSs86a7f0iqKQH4trOEInEPET7se31VJmeE0D0nKQJTW1q9SKRye0352h5D8M1ti2Iu+lvKk+YaWkQ1l+wAAmCqpLeK09nmtf4e0M6EifvphCEOuEcLxxepRz+XjgBuU61ACdSDuX4cr/zRyt6H9Lpt2nAsu3sCZxp9x1USPnb2U4kT05X4cUTAPiCnXz9n4fYB7FxR6JrqID3va1G1NAtQrM=';

// ─────────────────────────────────────────────
// SHARED IN-MEMORY STORE
// В Vercel каждая функция — отдельный worker,
// поэтому храним данные локально в этом модуле.
// ─────────────────────────────────────────────
const imageCache  = new Map(); // id → { buffer, mime, fetchedAt }
const stickerDocs = new Map(); // id → stickerDoc (MTProto Document)
let _client = null;
let _giftsLoadedAt = 0;
const GIFTS_TTL = 60 * 60 * 1000;

async function getClient() {
  if (_client && _client.connected) return _client;
  const client = new TelegramClient(
    new StringSession(SESSION),
    apiId,
    apiHash,
    { connectionRetries: 5, retryDelay: 1000, receiveUpdates: false }
  );
  await client.connect();
  _client = client;
  return client;
}

// Загружаем stickerDocs для всех подарков
async function ensureGiftsLoaded() {
  if (stickerDocs.size > 0 && Date.now() - _giftsLoadedAt < GIFTS_TTL) return;
  const client = await getClient();
  const result = await client.invoke(new Api.payments.GetStarGifts({ hash: 0 }));
  if (result.className === 'payments.StarGiftsNotModified' && stickerDocs.size > 0) return;
  for (const g of result.gifts ?? []) {
    const id = g.id?.toString();
    if (id && g.sticker) {
      stickerDocs.set(id, g.sticker);
    }
  }
  _giftsLoadedAt = Date.now();
}

function detectMime(buf) {
  if (!buf || buf.length < 4) return 'image/webp';
  const b = buf instanceof Buffer ? buf : Buffer.from(buf);
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return 'image/webp';
  if (b[0] === 0x89 && b[1] === 0x50) return 'image/png';
  if (b[0] === 0xFF && b[1] === 0xD8) return 'image/jpeg';
  if (b[0] === 0x47 && b[1] === 0x49) return 'image/gif';
  if (b[0] === 0x1F && b[1] === 0x8B) return 'application/x-tgsticker';
  return 'image/webp';
}

// SVG placeholder с эмодзи (возвращается при ошибке)
function makePlaceholderSvg(emoji = '🎁') {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <rect width="80" height="80" rx="14" fill="#1C1E28"/>
  <text x="40" y="54" text-anchor="middle" font-size="36" font-family="Apple Color Emoji,Segoe UI Emoji,sans-serif">${emoji}</text>
</svg>`);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const id  = url.searchParams.get('id');

  if (!id) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(400).send(makePlaceholderSvg());
  }

  // Возвращаем из кеша
  if (imageCache.has(id)) {
    const cached = imageCache.get(id);
    res.setHeader('Content-Type', cached.mime);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).send(cached.buffer);
  }

  try {
    await ensureGiftsLoaded();
    const stickerDoc = stickerDocs.get(id);

    if (!stickerDoc) {
      // Gift не найден — отдаём placeholder
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(404).send(makePlaceholderSvg('❓'));
    }

    const client = await getClient();
    const thumbs = stickerDoc.thumbs ?? [];

    // Предпочитаем встроенные bytes (нет сетевого запроса)
    const inlineCached = thumbs.find(
      t => t.className !== 'PhotoPathSize' && t.bytes?.length > 0
    );

    let buffer;
    let mime;

    if (inlineCached) {
      buffer = Buffer.from(inlineCached.bytes);
      mime   = 'image/webp';
    } else {
      // Ищем лучший размер для скачивания
      const preferred = ['m', 's', 'a'];
      let thumb = null;
      for (const sz of preferred) {
        thumb = thumbs.find(t => t.type === sz && t.className !== 'PhotoPathSize');
        if (thumb) break;
      }
      if (!thumb) thumb = thumbs.find(t => t.className !== 'PhotoPathSize') ?? null;

      const thumbSize = thumb?.type ?? '';
      const raw = await client.downloadFile(
        new Api.InputDocumentFileLocation({
          id:            stickerDoc.id,
          accessHash:    stickerDoc.accessHash,
          fileReference: stickerDoc.fileReference,
          thumbSize,
        }),
        { dcId: stickerDoc.dcId, workers: 1 }
      );

      buffer = raw instanceof Buffer ? raw : Buffer.from(raw);
      mime   = detectMime(buffer);
    }

    // Не кешируем TGS (анимации) как image — только статические
    const isStatic = !mime.includes('tgsticker') && !mime.includes('webm');
    if (isStatic && buffer.length > 0) {
      imageCache.set(id, { buffer, mime, fetchedAt: Date.now() });
    }

    res.setHeader('Content-Type',  mime);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).send(buffer);

  } catch (err) {
    console.error(`[gift-image] Error for id=${id}:`, err.message);
    res.setHeader('Content-Type',  'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(500).send(makePlaceholderSvg('🎁'));
  }
}

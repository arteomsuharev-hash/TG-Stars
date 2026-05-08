// api/gifts.js — Vercel Serverless Function
// Получает реальные StarGifts через MTProto и отдаёт изображения как base64

import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

const apiId   = 35428941;
const apiHash = 'ba211e1b4b260186488fe154a6ed7585';
const SESSION = '1AgAOMTQ5LjE1NC4xNjcuNDEBu6AFlypebj02yFbir2nbQx9l7eKvXQNHiy+oo6sUKgMyb5xrf3JCVTapyianLZznaD4AbOdvN6z/KZ1SBZgS6J9uNUcwRVyOGxE88ion68H/6nML47mHeciTSyfCYHrSs86a7f0iqKQH4trOEInEPET7se31VJmeE0D0nKQJTW1q9SKRye0352h5D8M1ti2Iu+lvKk+YaWkQ1l+wAAmCqpLeK09nmtf4e0M6EifvphCEOuEcLxxepRz+XjgBuU61ACdSDuX4cr/zRyt6H9Lpt2nAsu3sCZxp9x1USPnb2U4kT05X4cUTAPiCnXz9n4fYB7FxR6JrqID3va1G1NAtQrM=';

// ─────────────────────────────────────────────
// IN-MEMORY CACHE
// Живёт пока жив процесс Vercel (warm instance)
// ─────────────────────────────────────────────
const giftsCache = {
  list:      null,   // Array<GiftMeta>
  images:    new Map(), // giftId → base64DataUrl
  fetchedAt: 0,
};
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 час

// Singleton клиент
let _client = null;

async function getClient() {
  if (_client && _client.connected) return _client;
  const client = new TelegramClient(
    new StringSession(SESSION),
    apiId,
    apiHash,
    {
      connectionRetries: 5,
      retryDelay: 1000,
      useWSS: true,
      // Отключаем лишние обновления для serverless
      receiveUpdates: false,
    }
  );
  await client.connect();
  _client = client;
  return client;
}

// ─────────────────────────────────────────────
// СКАЧАТЬ THUMBNAIL ОДНОГО ПОДАРКА
// Возвращает base64 data URL или null
// ─────────────────────────────────────────────
async function downloadGiftThumbnail(client, stickerDoc) {
  if (!stickerDoc) return null;

  try {
    const thumbs = stickerDoc.thumbs ?? [];

    // Ищем лучший thumbnail по приоритету размеров
    const preferred = ['m', 's', 'a', 'b'];
    let thumb = null;
    for (const size of preferred) {
      thumb = thumbs.find(t => t.className !== 'PhotoPathSize' && t.type === size);
      if (thumb) break;
    }
    if (!thumb && thumbs.length > 0) {
      // Берём первый не-path thumbnail
      thumb = thumbs.find(t => t.className !== 'PhotoPathSize') ?? null;
    }

    // Если thumbnail встроен прямо в объект (photoCachedSize)
    if (thumb && thumb.bytes && thumb.bytes.length > 0) {
      const mimeType = 'image/webp';
      const b64 = Buffer.from(thumb.bytes).toString('base64');
      return `data:${mimeType};base64,${b64}`;
    }

    // Скачиваем thumbnail через InputDocumentFileLocation
    const thumbSize = thumb?.type ?? '';
    const buffer = await client.downloadFile(
      new Api.InputDocumentFileLocation({
        id:            stickerDoc.id,
        accessHash:    stickerDoc.accessHash,
        fileReference: stickerDoc.fileReference,
        thumbSize:     thumbSize,
      }),
      {
        dcId:       stickerDoc.dcId,
        fileSize:   thumb?.size ?? 65536,
        workers:    1,
      }
    );

    if (!buffer || buffer.length === 0) return null;

    // Определяем mime по сигнатуре
    const mime = detectMime(buffer);
    const b64  = Buffer.from(buffer).toString('base64');
    return `data:${mime};base64,${b64}`;

  } catch (err) {
    console.warn(`[TG] thumb download error for doc ${stickerDoc?.id}:`, err.message);
    return null;
  }
}

// Определение mime по magic bytes
function detectMime(buf) {
  if (!buf || buf.length < 4) return 'image/webp';
  const b = buf instanceof Buffer ? buf : Buffer.from(buf);
  // WebP: RIFF....WEBP
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return 'image/webp';
  // PNG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
  // JPEG
  if (b[0] === 0xFF && b[1] === 0xD8) return 'image/jpeg';
  // GIF
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  // TGS / gzip (Lottie)
  if (b[0] === 0x1F && b[1] === 0x8B) return 'application/x-tgsticker';
  return 'image/webp';
}

// Определяем rarity по цене в Stars
function getRarity(stars) {
  const s = Number(stars) || 0;
  if (s <= 30)  return 'common';
  if (s <= 80)  return 'rare';
  if (s <= 300) return 'epic';
  return 'legendary';
}

// Иконка-эмодзи как fallback по rarity
function rarityEmoji(rarity) {
  const map = { common: '🎁', rare: '💎', epic: '🔥', legendary: '👑' };
  return map[rarity] ?? '🎁';
}

// ─────────────────────────────────────────────
// ОСНОВНАЯ ФУНКЦИЯ — ПОЛУЧИТЬ ВСЕ ПОДАРКИ
// ─────────────────────────────────────────────
async function fetchAndCacheGifts() {
  const client = await getClient();

  const result = await client.invoke(
    new Api.payments.GetStarGifts({ hash: 0 })
  );

  if (result.className === 'payments.StarGiftsNotModified' && giftsCache.list) {
    return giftsCache.list;
  }

  const rawGifts = result.gifts ?? [];

  // Загружаем thumbnails параллельно с ограничением concurrency
  const CONCURRENCY = 3;
  const gifts = [];

  for (let i = 0; i < rawGifts.length; i += CONCURRENCY) {
    const batch = rawGifts.slice(i, i + CONCURRENCY);

    const batchResults = await Promise.all(
      batch.map(async (g) => {
        const id      = g.id?.toString() ?? String(i);
        const stars   = g.stars?.toString() ?? '0';
        const rarity  = getRarity(stars);
        const title   = g.title ?? null;

        // Скачиваем thumbnail
        let imageDataUrl = null;
        if (g.sticker) {
          // Проверяем кеш картинки
          if (giftsCache.images.has(id)) {
            imageDataUrl = giftsCache.images.get(id);
          } else {
            imageDataUrl = await downloadGiftThumbnail(client, g.sticker);
            if (imageDataUrl) {
              giftsCache.images.set(id, imageDataUrl);
            }
          }
        }

        return {
          id,
          name:             title ?? `Gift #${id}`,
          price:            Number(stars),
          stars,
          rarity,
          icon:             rarityEmoji(rarity),
          limited:          g.limited         ?? false,
          soldOut:          g.soldOut         ?? false,
          birthday:         g.birthday        ?? false,
          availabilityTotal:   g.availabilityTotal   ?? null,
          availabilityRemains: g.availabilityRemains ?? null,
          upgradeStars:     g.upgradeStars?.toString() ?? null,
          convertStars:     g.convertStars?.toString() ?? null,
          // Ключевое поле — реальная base64 картинка
          image_url:        imageDataUrl,
          // Флаг для фронтенда: реальная картинка или нет
          has_real_image:   !!imageDataUrl,
          // mime тип для правильного рендера
          image_mime:       imageDataUrl
            ? imageDataUrl.split(';')[0].replace('data:', '')
            : null,
        };
      })
    );

    gifts.push(...batchResults);

    // Небольшая пауза между батчами чтобы не флудить Telegram
    if (i + CONCURRENCY < rawGifts.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  giftsCache.list      = gifts;
  giftsCache.fetchedAt = Date.now();

  return gifts;
}

// ─────────────────────────────────────────────
// VERCEL SERVERLESS HANDLER
// Роуты:
//   GET /api/gifts           → список подарков
//   GET /api/gifts?id=123    → один подарок
//   GET /api/gifts?image=123 → бинарный endpoint (redirect)
// ─────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS — нужен для Mini App
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url    = new URL(req.url, `http://${req.headers.host}`);
  const idParam = url.searchParams.get('id');

  try {
    // Проверяем кеш
    const cacheStale = Date.now() - giftsCache.fetchedAt > CACHE_TTL_MS;

    if (!giftsCache.list || cacheStale) {
      await fetchAndCacheGifts();
    }

    // Один подарок по id
    if (idParam) {
      const gift = giftsCache.list?.find(g => g.id === idParam);
      if (!gift) {
        return res.status(404).json({ success: false, error: 'Gift not found' });
      }
      // Cache-Control: клиент кеширует на 1 час
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      return res.status(200).json({ success: true, gift });
    }

    // Полный список (без base64 данных — только URL)
    // Base64 слишком большие для списка, отдаём их через отдельный endpoint
    const publicList = (giftsCache.list ?? []).map(g => ({
      id:                  g.id,
      name:                g.name,
      price:               g.price,
      stars:               g.stars,
      rarity:              g.rarity,
      icon:                g.icon,
      limited:             g.limited,
      soldOut:             g.soldOut,
      birthday:            g.birthday,
      availabilityTotal:   g.availabilityTotal,
      availabilityRemains: g.availabilityRemains,
      upgradeStars:        g.upgradeStars,
      convertStars:        g.convertStars,
      has_real_image:      g.has_real_image,
      // image_url ссылается на наш же API endpoint
      image_url:           g.has_real_image
        ? `/api/gift-image?id=${g.id}`
        : null,
    }));

    res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
    return res.status(200).json({
      success: true,
      gifts:   publicList,
      total:   publicList.length,
      cached:  !cacheStale,
      cached_at: new Date(giftsCache.fetchedAt).toISOString(),
    });

  } catch (err) {
    console.error('[API /api/gifts] Error:', err);

    // Если кеш есть — отдаём его даже при ошибке
    if (giftsCache.list?.length) {
      const fallback = giftsCache.list.map(g => ({
        id:             g.id,
        name:           g.name,
        price:          g.price,
        stars:          g.stars,
        rarity:         g.rarity,
        icon:           g.icon,
        limited:        g.limited,
        soldOut:        g.soldOut,
        birthday:       g.birthday,
        has_real_image: g.has_real_image,
        image_url:      g.has_real_image ? `/api/gift-image?id=${g.id}` : null,
      }));
      return res.status(200).json({
        success:  true,
        gifts:    fallback,
        total:    fallback.length,
        cached:   true,
        from_err: true,
      });
    }

    return res.status(500).json({
      success: false,
      error:   err.message,
      gifts:   [],
    });
  }
}

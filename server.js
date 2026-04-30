import http from 'http';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import sharp from 'sharp';

const PORT = process.env.PORT || 3000;

const apiId = 35428941;
const apiHash = 'ba211e1b4b260186488fe154a6ed7585';
const SESSION = '1AgAOMTQ5LjE1NC4xNjcuNDEBu6AFlypebj02yFbir2nbQx9l7eKvXQNHiy+oo6sUKgMyb5xrf3JCVTapyianLZznaD4AbOdvN6z/KZ1SBZgS6J9uNUcwRVyOGxE88ion68H/6nML47mHeciTSyfCYHrSs86a7f0iqKQH4trOEInEPET7se31VJmeE0D0nKQJTW1q9SKRye0352h5D8M1ti2Iu+lvKk+YaWkQ1l+wAAmCqpLeK09nmtf4e0M6EifvphCEOuEcLxxepRz+XjgBuU61ACdSDuX4cr/zRyt6H9Lpt2nAsu3sCZxp9x1USPnb2U4kT05X4cUTAPiCnXz9n4fYB7FxR6JrqID3va1G1NAtQrM=';

// Функция для установки CORS заголовков
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// Скачивание стикера
async function downloadSticker(sticker) {
  if (!sticker || !sticker.id) return null;
  
  const client = new TelegramClient(new StringSession(SESSION), apiId, apiHash, { connectionRetries: 2 });
  await client.connect();
  
  try {
    const buffer = await client.downloadFile(
      new Api.InputDocumentFileLocation({
        id: BigInt(sticker.id),
        accessHash: BigInt(sticker.accessHash),
        fileReference: Buffer.alloc(0),
        thumbSize: "",
      }),
      { dcId: sticker.dcId || 2, fileSize: 512 * 1024 }
    );
    await client.disconnect();
    return Buffer.from(buffer);
  } catch(e) {
    console.error('Download error:', e.message);
    await client.disconnect();
    return null;
  }
}

// Генерация картинки
async function generateGiftImage(stickerBuffer, price) {
  if (!stickerBuffer) return null;
  
  let frameColor = '';
  let borderWidth = 2;
  
  if (price >= 500) {
    frameColor = '#ffd700';
    borderWidth = 3;
  } else if (price >= 200) {
    frameColor = '#c0c0c0';
  } else if (price >= 80) {
    frameColor = '#cd7f32';
  } else {
    frameColor = '#555';
  }
  
  const size = 200;
  const frameSize = 20;
  const imgSize = size - frameSize * 2;
  
  try {
    let stickerPng = stickerBuffer;
    if (stickerBuffer.length > 0) {
      stickerPng = await sharp(stickerBuffer)
        .resize(imgSize, imgSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
    }
    
    const frame = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 26, g: 26, b: 46, alpha: 1 }
      }
    })
    .composite([
      {
        input: await sharp({
          create: {
            width: size,
            height: size,
            channels: 4,
            background: { r: parseInt(frameColor.slice(1,3), 16), g: parseInt(frameColor.slice(3,5), 16), b: parseInt(frameColor.slice(5,7), 16), alpha: 1 }
          }
        }).png().toBuffer(),
      },
      {
        input: await sharp({
          create: {
            width: imgSize,
            height: imgSize,
            channels: 4,
            background: { r: 26, g: 26, b: 46, alpha: 1 }
          }
        }).png().toBuffer(),
        left: frameSize,
        top: frameSize,
      }
    ])
    .png()
    .toBuffer();
    
    const result = await sharp(frame)
      .composite([
        {
          input: stickerPng,
          left: frameSize,
          top: frameSize + 10,
        }
      ])
      .png()
      .toBuffer();
    
    return result;
  } catch(e) {
    console.error('Generate error:', e);
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  // Устанавливаем CORS заголовки для всех ответов
  setCorsHeaders(res);
  
  // Обработка preflight запросов
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // GET /api/gifts
  if (req.method === 'GET' && req.url === '/api/gifts') {
    try {
      const client = new TelegramClient(new StringSession(SESSION), apiId, apiHash, { connectionRetries: 3 });
      await client.connect();
      const result = await client.invoke(new Api.payments.GetStarGifts({ hash: 0 }));
      
      const gifts = result.gifts.map(g => ({
        id: g.id.toString(),
        name: g.title,
        price: g.stars,
        sticker: g.sticker ? { 
          id: g.sticker.id.toString(), 
          accessHash: g.sticker.accessHash.toString(), 
          dcId: g.sticker.dcId 
        } : null,
      }));
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, gifts }));
    } catch (error) {
      console.error('Gifts error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }
  
  // POST /api/gift-image
  if (req.method === 'POST' && req.url === '/api/gift-image') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const gift = JSON.parse(body);
        
        // Если нет стикера — возвращаем эмодзи
        if (!gift.sticker || !gift.sticker.id) {
          const price = gift.price || 0;
          let emoji = price >= 500 ? '💎' : (price >= 200 ? '✨' : (price >= 80 ? '⭐' : '🎁'));
          let frameColor = price >= 500 ? '#ffd700' : (price >= 200 ? '#c0c0c0' : (price >= 80 ? '#cd7f32' : '#555'));
          const svg = `<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
            <rect width="80" height="80" rx="16" fill="#1a1a2e" stroke="${frameColor}" stroke-width="3"/>
            <text x="40" y="55" font-size="40" text-anchor="middle" fill="white">${emoji}</text>
          </svg>`;
          res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
          res.end(svg);
          return;
        }
        
        const stickerBuffer = await downloadSticker(gift.sticker);
        if (!stickerBuffer) {
          throw new Error('Failed to download sticker');
        }
        
        const imageBuffer = await generateGiftImage(stickerBuffer, gift.price);
        if (!imageBuffer) {
          throw new Error('Failed to generate image');
        }
        
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(imageBuffer);
      } catch (error) {
        console.error('Image error:', error);
        const price = JSON.parse(body).price || 0;
        let emoji = price >= 500 ? '💎' : (price >= 200 ? '✨' : (price >= 80 ? '⭐' : '🎁'));
        let frameColor = price >= 500 ? '#ffd700' : (price >= 200 ? '#c0c0c0' : (price >= 80 ? '#cd7f32' : '#555'));
        const svg = `<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
          <rect width="80" height="80" rx="16" fill="#1a1a2e" stroke="${frameColor}" stroke-width="3"/>
          <text x="40" y="55" font-size="40" text-anchor="middle" fill="white">${emoji}</text>
        </svg>`;
        res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
        res.end(svg);
      }
    });
    return;
  }
  
  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});

import http from 'http';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import sharp from 'sharp';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const PORT = process.env.PORT || 3000;

const apiId = 35428941;
const apiHash = 'ba211e1b4b260186488fe154a6ed7585';
const SESSION = '1AgAOMTQ5LjE1NC4xNjcuNDEBu6AFlypebj02yFbir2nbQx9l7eKvXQNHiy+oo6sUKgMyb5xrf3JCVTapyianLZznaD4AbOdvN6z/KZ1SBZgS6J9uNUcwRVyOGxE88ion68H/6nML47mHeciTSyfCYHrSs86a7f0iqKQH4trOEInEPET7se31VJmeE0D0nKQJTW1q9SKRye0352h5D8M1ti2Iu+lvKk+YaWkQ1l+wAAmCqpLeK09nmtf4e0M6EifvphCEOuEcLxxepRz+XjgBuU61ACdSDuX4cr/zRyt6H9Lpt2nAsu3sCZxp9x1USPnb2U4kT05X4cUTAPiCnXz9n4fYB7FxR6JrqID3va1G1NAtQrM=';

// Функция для скачивания стикера
async function downloadSticker(sticker) {
  const client = new TelegramClient(new StringSession(SESSION), apiId, apiHash, { connectionRetries: 3 });
  await client.connect();
  
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
}

// Функция для генерации картинки с рамкой
async function generateGiftImage(stickerBuffer, price) {
  let frameColor = '';
  let glowColor = '';
  let borderWidth = 2;
  
  if (price >= 500) {
    frameColor = '#ffd700';
    glowColor = 'rgba(255,215,0,0.5)';
    borderWidth = 3;
  } else if (price >= 200) {
    frameColor = '#c0c0c0';
    glowColor = 'rgba(192,192,192,0.4)';
  } else if (price >= 80) {
    frameColor = '#cd7f32';
    glowColor = 'rgba(205,127,50,0.3)';
  } else {
    frameColor = '#555';
    glowColor = 'rgba(100,100,100,0.2)';
  }
  
  // Конвертируем стикер в PNG
  let stickerPng = stickerBuffer;
  if (stickerBuffer[0] === 0x1f && stickerBuffer[1] === 0x8b) {
    // Если TGS — нужно конвертировать через Puppeteer
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    // ... упрощённо: возвращаем пока эмодзи
    await browser.close();
    return null;
  } else {
    stickerPng = await sharp(stickerBuffer).resize(200, 200, { fit: 'contain' }).png().toBuffer();
  }
  
  // Создаём картинку с рамкой
  const width = 240;
  const height = 240;
  const frameSize = 20;
  
  const canvas = sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: { r: 26, g: 26, b: 46, alpha: 1 }
    }
  });
  
  // Рисуем рамку
  const frameBuffer = await sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: { r: parseInt(frameColor.slice(1,3), 16), g: parseInt(frameColor.slice(3,5), 16), b: parseInt(frameColor.slice(5,7), 16), alpha: 1 }
    }
  }).png().toBuffer();
  
  const result = await sharp(frameBuffer)
    .composite([
      {
        input: stickerPng,
        left: (width - 200) / 2,
        top: (height - 200) / 2 + 10,
      }
    ])
    .png()
    .toBuffer();
  
  return result;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // GET /api/gifts — список подарков
  if (req.method === 'GET' && req.url === '/api/gifts') {
    try {
      const client = new TelegramClient(new StringSession(SESSION), apiId, apiHash, { connectionRetries: 3 });
      await client.connect();
      const result = await client.invoke(new Api.payments.GetStarGifts({ hash: 0 }));
      
      const gifts = result.gifts.map(g => ({
        id: g.id.toString(),
        name: g.title,
        price: g.stars,
        sticker: g.sticker ? { id: g.sticker.id, accessHash: g.sticker.accessHash, dcId: g.sticker.dcId } : null,
      }));
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, gifts }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }
  
  // POST /api/gift-image — генерация картинки
  if (req.method === 'POST' && req.url === '/api/gift-image') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const gift = JSON.parse(body);
        
        if (!gift.sticker) {
          throw new Error('No sticker data');
        }
        
        const stickerBuffer = await downloadSticker(gift.sticker);
        const imageBuffer = await generateGiftImage(stickerBuffer, gift.price);
        
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(imageBuffer);
      } catch (error) {
        console.error('Image error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
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

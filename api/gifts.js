import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

const apiId = 35428941;
const apiHash = 'ba211e1b4b260186488fe154a6ed7585';
const SESSION = '1AgAOMTQ5LjE1NC4xNjcuNDEBu6AFlypebj02yFbir2nbQx9l7eKvXQNHiy+oo6sUKgMyb5xrf3JCVTapyianLZznaD4AbOdvN6z/KZ1SBZgS6J9uNUcwRVyOGxE88ion68H/6nML47mHeciTSyfCYHrSs86a7f0iqKQH4trOEInEPET7se31VJmeE0D0nKQJTW1q9SKRye0352h5D8M1ti2Iu+lvKk+YaWkQ1l+wAAmCqpLeK09nmtf4e0M6EifvphCEOuEcLxxepRz+XjgBuU61ACdSDuX4cr/zRyt6H9Lpt2nAsu3sCZxp9x1USPnb2U4kT05X4cUTAPiCnXz9n4fYB7FxR6JrqID3va1G1NAtQrM=';

// Функция для конвертации MTProto ID в Bot API file_id
function convertToBotApiFileId(sticker) {
  if (!sticker || !sticker.id || !sticker.accessHash) return null;
  
  try {
    // Создаём buffer в формате, который понимает Telegram Bot API
    const buffer = Buffer.alloc(4 + 8 + 8 + 8 + 1 + 4);
    let offset = 0;
    
    // DC ID (4 байта)
    buffer.writeUInt32LE(sticker.dcId || 2, offset);
    offset += 4;
    
    // ID (8 байт)
    buffer.writeBigUInt64LE(BigInt(sticker.id), offset);
    offset += 8;
    
    // Access Hash (8 байт)
    buffer.writeBigUInt64LE(BigInt(sticker.accessHash), offset);
    offset += 8;
    
    // Версия (8 байт) — для стикеров обычно 0
    buffer.writeBigUInt64LE(BigInt(sticker.version || 0), offset);
    offset += 8;
    
    // Тип файла (1 байт) — 3 = стикер
    buffer.writeUInt8(3, offset);
    offset += 1;
    
    // Размер file_reference (4 байта) и сами данные
    const fileRef = sticker.fileReference || Buffer.alloc(0);
    buffer.writeUInt32LE(fileRef.length, offset);
    offset += 4;
    fileRef.copy(buffer, offset);
    
    // Кодируем в base64
    return buffer.toString('base64');
    
  } catch(e) {
    console.error('Convert error:', e.message);
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const client = new TelegramClient(
      new StringSession(SESSION),
      apiId,
      apiHash,
      { connectionRetries: 3 }
    );
    
    await client.connect();
    const result = await client.invoke(new Api.payments.GetStarGifts({ hash: 0 }));
    
    const gifts = [];
    for (const gift of result.gifts) {
      let botApiFileId = null;
      
      if (gift.sticker) {
        botApiFileId = convertToBotApiFileId(gift.sticker);
      }
      
      gifts.push({
        id: gift.id.toString(),
        name: gift.title,
        price: gift.stars,
        sticker_file_id: botApiFileId,
      });
    }
    
    console.log(`✅ Total: ${gifts.length}, with images: ${gifts.filter(g => g.sticker_file_id).length}`);
    res.json({ success: true, gifts });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

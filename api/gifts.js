import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

const apiId = 35428941;
const apiHash = 'ba211e1b4b260186488fe154a6ed7585';
const SESSION = '1AgAOMTQ5LjE1NC4xNjcuNDEBu6AFlypebj02yFbir2nbQx9l7eKvXQNHiy+oo6sUKgMyb5xrf3JCVTapyianLZznaD4AbOdvN6z/KZ1SBZgS6J9uNUcwRVyOGxE88ion68H/6nML47mHeciTSyfCYHrSs86a7f0iqKQH4trOEInEPET7se31VJmeE0D0nKQJTW1q9SKRye0352h5D8M1ti2Iu+lvKk+YaWkQ1l+wAAmCqpLeK09nmtf4e0M6EifvphCEOuEcLxxepRz+XjgBuU61ACdSDuX4cr/zRyt6H9Lpt2nAsu3sCZxp9x1USPnb2U4kT05X4cUTAPiCnXz9n4fYB7FxR6JrqID3va1G1NAtQrM=';

// Функция для конвертации MTProto ID в Bot API file_id
function convertToBotApiFileId(sticker) {
  if (!sticker || !sticker.id || !sticker.accessHash) return null;
  
  // Формируем file_id в формате, понятном Bot API
  // Структура: <type><dc_id><id><access_hash><file_reference>
  const type = 3; // 3 = стикер (WebP)
  const dcId = sticker.dcId || 2;
  const id = sticker.id;
  const accessHash = sticker.accessHash;
  const fileReference = sticker.fileReference || Buffer.alloc(0);
  
  // Собираем буфер
  const buffer = Buffer.alloc(4 + 8 + 8 + 1 + fileReference.length);
  let offset = 0;
  
  // Тип (4 байта)
  buffer.writeUInt32LE(type, offset);
  offset += 4;
  
  // DC ID (4 байта, но в file_id он идёт как 32-bit)
  buffer.writeUInt32LE(dcId, offset);
  offset += 4;
  
  // ID (8 байт)
  buffer.writeBigUInt64LE(BigInt(id), offset);
  offset += 8;
  
  // Access Hash (8 байт)
  buffer.writeBigUInt64LE(BigInt(accessHash), offset);
  offset += 8;
  
  // File Reference (остальное)
  fileReference.copy(buffer, offset);
  
  // Кодируем в base64
  return buffer.toString('base64');
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
        if (botApiFileId) {
          // Для диагностики: выводим первые 3 file_id
          if (gifts.length < 3) {
            console.log(`Gift ${gift.id}: file_id created`);
          }
        }
      }
      
      gifts.push({
        id: gift.id.toString(),
        name: gift.title,
        price: gift.stars,
        sticker_file_id: botApiFileId,
      });
    }
    
    console.log(`✅ Total gifts: ${gifts.length}, with images: ${gifts.filter(g => g.sticker_file_id).length}`);
    res.json({ success: true, gifts });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

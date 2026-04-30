import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

const apiId = 35428941;
const apiHash = 'ba211e1b4b260186488fe154a6ed7585';
const SESSION = '1AgAOMTQ5LjE1NC4xNjcuNDEBu6AFlypebj02yFbir2nbQx9l7eKvXQNHiy+oo6sUKgMyb5xrf3JCVTapyianLZznaD4AbOdvN6z/KZ1SBZgS6J9uNUcwRVyOGxE88ion68H/6nML47mHeciTSyfCYHrSs86a7f0iqKQH4trOEInEPET7se31VJmeE0D0nKQJTW1q9SKRye0352h5D8M1ti2Iu+lvKk+YaWkQ1l+wAAmCqpLeK09nmtf4e0M6EifvphCEOuEcLxxepRz+XjgBuU61ACdSDuX4cr/zRyt6H9Lpt2nAsu3sCZxp9x1USPnb2U4kT05X4cUTAPiCnXz9n4fYB7FxR6JrqID3va1G1NAtQrM=';

// Преобразование отрицательных чисел в беззнаковые
function toUnsigned(value) {
  if (typeof value === 'bigint') {
    if (value < 0) {
      return value + 0x10000000000000000n;
    }
    return value;
  }
  const num = Number(value);
  if (num < 0) {
    return BigInt(num >>> 0);
  }
  return BigInt(num);
}

// Функция для конвертации MTProto ID в Bot API file_id
function convertToBotApiFileId(sticker) {
  if (!sticker || !sticker.id || !sticker.accessHash) return null;
  
  try {
    const buffer = Buffer.alloc(4 + 4 + 8 + 8 + 4 + 8);
    let offset = 0;
    
    // Version (4 байта)
    buffer.writeUInt32LE(0, offset);
    offset += 4;
    
    // DC ID (4 байта)
    buffer.writeUInt32LE(sticker.dcId || 2, offset);
    offset += 4;
    
    // ID (8 байт) — преобразуем отрицательные числа
    const idValue = toUnsigned(sticker.id);
    buffer.writeBigUInt64LE(idValue, offset);
    offset += 8;
    
    // Access Hash (8 байт)
    const hashValue = toUnsigned(sticker.accessHash);
    buffer.writeBigUInt64LE(hashValue, offset);
    offset += 8;
    
    // Тип (4 байта) — 3 = стикер
    buffer.writeUInt32LE(3, offset);
    offset += 4;
    
    // File reference (8 байт, пустой)
    buffer.writeBigUInt64LE(0n, offset);
    
    return buffer.toString('base64');
    
  } catch(e) {
    console.error(`Convert error for ${sticker.id}:`, e.message);
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
    
    const gifts = result.gifts.map(g => {
      let botApiFileId = null;
      
      if (g.sticker) {
        botApiFileId = convertToBotApiFileId({
          id: g.sticker.id,
          accessHash: g.sticker.accessHash,
          dcId: g.sticker.dcId,
        });
      }
      
      return {
        id: g.id.toString(),
        name: g.title,
        price: g.stars,
        sticker_file_id: botApiFileId,
      };
    });
    
    const withImages = gifts.filter(g => g.sticker_file_id).length;
    console.log(`✅ Total: ${gifts.length}, with images: ${withImages}`);
    res.json({ success: true, gifts });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

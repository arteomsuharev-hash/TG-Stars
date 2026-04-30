import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

const apiId = 35428941;
const apiHash = 'ba211e1b4b260186488fe154a6ed7585';
const PHONE_NUMBER = '+79941446614';
const SESSION = '1AgAOMTQ5LjE1NC4xNjcuNDEBu6AFlypebj02yFbir2nbQx9l7eKvXQNHiy+oo6sUKgMyb5xrf3JCVTapyianLZznaD4AbOdvN6z/KZ1SBZgS6J9uNUcwRVyOGxE88ion68H/6nML47mHeciTSyfCYHrSs86a7f0iqKQH4trOEInEPET7se31VJmeE0D0nKQJTW1q9SKRye0352h5D8M1ti2Iu+lvKk+YaWkQ1l+wAAmCqpLeK09nmtf4e0M6EifvphCEOuEcLxxepRz+XjgBuU61ACdSDuX4cr/zRyt6H9Lpt2nAsu3sCZxp9x1USPnb2U4kT05X4cUTAPiCnXz9n4fYB7FxR6JrqID3va1G1NAtQrM=';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    console.log('🔄 Connecting to Telegram...');
    
    const client = new TelegramClient(
      new StringSession(SESSION),
      apiId,
      apiHash,
      { connectionRetries: 5 }
    );
    
    await client.connect();
    console.log('✅ Connected');
    
    const result = await client.invoke(new Api.payments.GetStarGifts({ hash: 0 }));
    console.log('✅ Got gifts, count:', result.gifts.length);
    
    // Упрощённое формирование ответа
    const gifts = result.gifts.map(gift => {
      // Пробуем получить sticker_file_id безопасно
      let stickerFileId = null;
      try {
        if (gift.sticker && typeof gift.sticker === 'object') {
          stickerFileId = gift.sticker.id || null;
        }
      } catch(e) {
        console.warn('Error getting sticker for gift', gift.id);
      }
      
      return {
        id: String(gift.id),
        name: gift.title || 'Unknown Gift',
        price: gift.stars,
        sticker_file_id: stickerFileId,
        is_unique: !!(gift.attributes && gift.attributes.length)
      };
    });
    
    console.log(`✅ Sending ${gifts.length} gifts`);
    res.json({ success: true, count: gifts.length, gifts });
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

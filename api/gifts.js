import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { FileId } from 'tg-file-decoder';

const apiId = 35428941;
const apiHash = 'ba211e1b4b260186488fe154a6ed7585';
const SESSION = '1AgAOMTQ5LjE1NC4xNjcuNDEBu6AFlypebj02yFbir2nbQx9l7eKvXQNHiy+oo6sUKgMyb5xrf3JCVTapyianLZznaD4AbOdvN6z/KZ1SBZgS6J9uNUcwRVyOGxE88ion68H/6nML47mHeciTSyfCYHrSs86a7f0iqKQH4trOEInEPET7se31VJmeE0D0nKQJTW1q9SKRye0352h5D8M1ti2Iu+lvKk+YaWkQ1l+wAAmCqpLeK09nmtf4e0M6EifvphCEOuEcLxxepRz+XjgBuU61ACdSDuX4cr/zRyt6H9Lpt2nAsu3sCZxp9x1USPnb2U4kT05X4cUTAPiCnXz9n4fYB7FxR6JrqID3va1G1NAtQrM=';

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
      
      if (gift.sticker && gift.sticker.id && gift.sticker.accessHash) {
        try {
          // Конвертируем через библиотеку
          const fileId = new FileId({
            type: 3, // STICKER тип
            id: gift.sticker.id,
            accessHash: gift.sticker.accessHash,
            dcId: gift.sticker.dcId || 2,
            fileReference: gift.sticker.fileReference || Buffer.alloc(0),
            version: gift.sticker.version || 1
          });
          botApiFileId = fileId.getBotAPI();
        } catch(e) {
          console.error(`Convert error for gift ${gift.id}:`, e.message);
        }
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

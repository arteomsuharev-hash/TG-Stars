import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

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
    
    // Для каждого подарка получаем реальный file_id через getDocument
    const gifts = [];
    for (const gift of result.gifts) {
      let realFileId = null;
      
      if (gift.sticker) {
        try {
          // Получаем информацию о стикере через getDocument
          const document = await client.invoke(new Api.upload.GetFile({
            location: new Api.InputDocumentFileLocation({
              id: gift.sticker.id,
              accessHash: gift.sticker.accessHash,
              thumbSize: '',
              version: gift.sticker.version
            }),
            limit: 32,
            offset: 0
          }));
          
          // Формируем file_id в формате, понятном Bot API
          if (document) {
            realFileId = `${gift.sticker.id}_${gift.sticker.accessHash}`;
          }
        } catch(e) {
          console.error(`Error getting file for gift ${gift.id}:`, e.message);
        }
      }
      
      gifts.push({
        id: gift.id.toString(),
        name: gift.title,
        price: gift.stars,
        sticker_file_id: realFileId,
      });
    }
    
    res.json({ success: true, gifts });
    
  } catch (error) {
    console.error(error);
    res.json({ success: false, error: error.message });
  }
}

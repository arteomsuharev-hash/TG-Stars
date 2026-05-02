import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { fetchGift } from '@roj/gifts';

const apiId = 35428941;
const apiHash = 'ba211e1b4b260186488fe154a6ed7585';
const SESSION = '1AgAOMTQ5LjE1NC4xNjcuNDEBu6AFlypebj02yFbir2nbQx9l7eKvXQNHiy+oo6sUKgMyb5xrf3JCVTapyianLZznaD4AbOdvN6z/KZ1SBZgS6J9uNUcwRVyOGxE88ion68H/6nML47mHeciTSyfCYHrSs86a7f0iqKQH4trOEInEPET7se31VJmeE0D0nKQJTW1q9SKRye0352h5D8M1ti2Iu+lvKk+YaWkQ1l+wAAmCqpLeK09nmtf4e0M6EifvphCEOuEcLxxepRz+XjgBuU61ACdSDuX4cr/zRyt6H9Lpt2nAsu3sCZxp9x1USPnb2U4kT05X4cUTAPiCnXz9n4fYB7FxR6JrqID3va1G1NAtQrM=';

// Кэш для tgsUrl
const tgsCache = {};

async function getTgsUrl(giftId, giftName) {
  if (tgsCache[giftId]) return tgsCache[giftId];
  
  try {
    const slug = giftName.toLowerCase().replace(/ /g, '-');
    const gift = await fetchGift(slug, 1);
    
    if (gift && gift.tgsUrl) {
      tgsCache[giftId] = gift.tgsUrl;
      return gift.tgsUrl;
    }
  } catch(e) {
    console.error(`Ошибка получения tgsUrl для ${giftName}:`, e.message);
  }
  return null;
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
    for (const g of result.gifts) {
      const tgsUrl = await getTgsUrl(g.id, g.title);
      
      gifts.push({
        id: g.id.toString(),
        name: g.title,
        price: g.stars,
        image_url: tgsUrl,
        animation_url: tgsUrl
      });
    }
    
    res.json({ success: true, gifts });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

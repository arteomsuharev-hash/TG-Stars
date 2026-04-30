import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

const apiId = 35428941;
const apiHash = 'ba211e1b4b260186488fe154a6ed7585';
const SESSION = '1AgAOMTQ5LjE1NC4xNjcuNDEBu6AFlypebj02yFbir2nbQx9l7eKvXQNHiy+oo6sUKgMyb5xrf3JCVTapyianLZznaD4AbOdvN6z/KZ1SBZgS6J9uNUcwRVyOGxE88ion68H/6nML47mHeciTSyfCYHrSs86a7f0iqKQH4trOEInEPET7se31VJmeE0D0nKQJTW1q9SKRye0352h5D8M1ti2Iu+lvKk+YaWkQ1l+wAAmCqpLeK09nmtf4e0M6EifvphCEOuEcLxxepRz+XjgBuU61ACdSDuX4cr/zRyt6H9Lpt2nAsu3sCZxp9x1USPnb2U4kT05X4cUTAPiCnXz9n4fYB7FxR6JrqID3va1G1NAtQrM=';

// Публичные API для картинок (в порядке приоритета)
const IMAGE_APIS = [
  'https://giftapi.vercel.app/api/gifts',
  'https://gift-api.herokuapp.com/api/gifts',
  'https://api.giftasset.io/v1/gifts'
];

async function getImageMap() {
  for (const url of IMAGE_APIS) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const gifts = data.gifts || data;
        const map = {};
        gifts.forEach(g => {
          const id = g.id;
          const imageUrl = g.image_url || g.photo_url || g.sticker_url;
          if (id && imageUrl) map[id] = imageUrl;
        });
        console.log(`✅ Картинки загружены из: ${url}, найдено: ${Object.keys(map).length}`);
        return map;
      }
    } catch(e) {
      console.warn(`❌ API не работает: ${url}`, e.message);
    }
  }
  return {};
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // 1. Получаем названия и цены из MTProto
    const client = new TelegramClient(
      new StringSession(SESSION),
      apiId,
      apiHash,
      { connectionRetries: 3 }
    );
    
    await client.connect();
    const result = await client.invoke(new Api.payments.GetStarGifts({ hash: 0 }));
    
    // 2. Получаем картинки из публичного API
    const imageMap = await getImageMap();
    
    // 3. Объединяем данные
    const gifts = result.gifts.map(g => {
      const giftId = g.id.toString();
      return {
        id: giftId,
        name: g.title,
        price: g.stars,
        image_url: imageMap[giftId] || null,  // если картинки нет — будет null
        icon: '🎁'
      };
    });
    
    const withImages = gifts.filter(g => g.image_url).length;
    console.log(`✅ Загружено ${gifts.length} подарков, из них с картинками: ${withImages}`);
    res.json({ success: true, gifts });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

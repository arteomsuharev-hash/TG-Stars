// api/gifts.js
export default async function handler(req, res) {
  // Разрешаем запросы с твоего сайта
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Gift Asset API — готовые картинки подарков
    const response = await fetch('https://gifts-api.deno.dev/gifts');
    const data = await response.json();
    
    if (!data.gifts) {
      throw new Error('API вернул неверный формат');
    }
    
    const gifts = data.gifts.map(g => ({
      id: g.id,
      name: g.name,
      price: g.price,
      image_url: g.image_url,      // ← готовая картинка PNG
      animation_url: g.animation_url // ← анимация если есть
    }));
    
    console.log(`✅ Загружено ${gifts.length} подарков из Gift Asset API`);
    res.json({ success: true, gifts });
    
  } catch (error) {
    console.error('Gift Asset API error:', error);
    
    // Запасной вариант — базовый список подарков (эмодзи)
    const fallbackGifts = [
      { id: 'shard', name: 'Astral Shard', price: 50, image_url: null },
      { id: 'pepe', name: 'Plush Pepe', price: 25, image_url: null },
      { id: 'crown', name: 'Astral Crown', price: 500, image_url: null }
    ];
    
    res.json({ success: true, gifts: fallbackGifts, fallback: true });
  }
}

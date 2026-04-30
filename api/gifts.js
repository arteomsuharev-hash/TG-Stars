export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Рабочий публичный API с картинками подарков
  const API_URL = 'https://gift-api.deno.dev/gifts';
  
  try {
    console.log('🔄 Загружаем подарки из публичного API...');
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const gifts = (data.gifts || data).map(g => ({
      id: g.id,
      name: g.title || g.name,
      price: g.stars || g.price,
      image_url: g.image_url || g.photo_url || g.sticker_url,
    }));
    
    console.log(`✅ Загружено ${gifts.length} подарков с картинками`);
    res.json({ success: true, gifts });
    
  } catch (error) {
    console.error('❌ Ошибка загрузки:', error.message);
    
    // Фолбэк: базовый список подарков (если API не работает)
    const fallbackGifts = [
      { id: 1, name: "Astral Shard", price: 50, image_url: null },
      { id: 2, name: "Plush Pepe", price: 25, image_url: null },
      { id: 3, name: "Star Blast", price: 100, image_url: null },
    ];
    
    res.json({ success: true, gifts: fallbackGifts, fallback: true });
  }
}

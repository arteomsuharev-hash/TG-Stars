export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Список API в порядке приоритета
  const apis = [
    'https://api.giftasset.io/v1/gifts',
    'https://giftapi.vercel.app/api/gifts',
    'https://gift-api.herokuapp.com/api/gifts'
  ];
  
  for (const url of apis) {
    try {
      console.log(`🔄 Пробуем: ${url}`);
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        const gifts = (data.gifts || data).map(g => ({
          id: g.id,
          name: g.title || g.name,
          price: g.stars || g.price,
          image_url: g.image_url || g.photo_url || g.sticker_url,
        }));
        
        console.log(`✅ Загружено ${gifts.length} подарков из ${url}`);
        return res.json({ success: true, gifts });
      }
    } catch(e) {
      console.warn(`Ошибка: ${url}`, e.message);
    }
  }
  
  // Если все API упали — отдаём данные из MTProto (без картинок)
  // Здесь ты можешь вызвать свой MTProto код или отдать базовый список
  res.json({ 
    success: true, 
    gifts: [],
    error: 'No API available',
    fallback: true
  });
}

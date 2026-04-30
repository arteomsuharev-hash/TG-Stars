export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // Новый публичный API с реальными картинками подарков
    const response = await fetch('https://gifts.tginfo.me/api/gifts');
    const data = await response.json();
    
    const gifts = (data.gifts || data).map(g => ({
      id: g.id,
      name: g.title || g.name,
      price: g.stars || g.price || 50,
      image_url: g.image_url || g.photo_url || g.sticker_url,
    }));
    
    console.log(`✅ Загружено ${gifts.length} подарков с картинками`);
    res.json({ success: true, gifts });
    
  } catch (error) {
    console.error('API error:', error);
    
    // Резервный API (если первый упал)
    try {
      const fallbackRes = await fetch('https://gift-api.deno.dev/gifts');
      const fallbackData = await fallbackRes.json();
      const gifts = (fallbackData.gifts || fallbackData).map(g => ({
        id: g.id,
        name: g.title || g.name,
        price: g.stars || g.price || 50,
        image_url: g.image_url || g.sticker_url,
      }));
      
      return res.json({ success: true, gifts });
    } catch(e) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

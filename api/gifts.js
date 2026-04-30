export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // Другой публичный API с прямыми ссылками на картинки
    const response = await fetch('https://gift-api.deno.dev/gifts');
    const data = await response.json();
    
    const gifts = (data.gifts || data).map(g => ({
      id: g.id,
      name: g.title || g.name,
      price: g.stars || g.price,
      image_url: g.image_url || g.sticker_url,
    }));
    
    res.json({ success: true, gifts });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

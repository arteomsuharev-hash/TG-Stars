export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // Публичное API с реальными картинками
    const response = await fetch('https://gift-api.herokuapp.com/api/gifts');
    const data = await response.json();
    
    const gifts = data.gifts.map(g => ({
      id: g.id,
      name: g.title,
      price: g.stars,
      image_url: g.photo_url || g.sticker_url,
    }));
    
    res.json({ success: true, gifts });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

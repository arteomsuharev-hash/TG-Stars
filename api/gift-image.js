export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const gift = req.body;
    console.log('Received gift:', JSON.stringify(gift, null, 2));
    
    // Пока просто возвращаем эмодзи вместо картинки
    const price = gift.price || 0;
    const emoji = price >= 500 ? '💎' : (price >= 200 ? '✨' : (price >= 80 ? '⭐' : '🎁'));
    
    // Генерируем простую SVG картинку
    const svg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="20" fill="#1a1a2e" stroke="${price >= 500 ? '#ffd700' : '#c0c0c0'}" stroke-width="3"/>
      <text x="50" y="68" font-size="50" text-anchor="middle" fill="white">${emoji}</text>
    </svg>`;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(200).send(svg);
    
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
}

export default async function handler(req, res) {
  const { file_id } = req.query;
  
  if (!file_id) {
    return res.status(400).json({ error: 'Missing file_id' });
  }
  
  const BOT_TOKEN = '8209263425:AAFZQzJCzLmnV044UPaCWJWJZ3ZQw24H85k';
  
  try {
    // Получаем ссылку на файл через Bot API
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${file_id}`);
    const data = await response.json();
    
    if (!data.ok) {
      console.error('Telegram error:', data);
      return res.status(500).json({ error: 'Telegram API error', details: data });
    }
    
    // Получаем и возвращаем картинку
    const imageUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;
    const image = await fetch(imageUrl);
    const buffer = await image.arrayBuffer();
    
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(buffer));
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
}

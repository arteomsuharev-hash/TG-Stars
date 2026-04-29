export default async function handler(req, res) {
  const { file_id } = req.query;
  
  if (!file_id) {
    return res.status(400).json({ error: 'Missing file_id' });
  }
  
  const BOT_TOKEN = '8209263425:AAFZQzJCzLmnV044UPaCWJWJZ3ZQw24H85k';
  
  try {
    const fileInfo = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${file_id}`);
    const fileData = await fileInfo.json();
    
    if (!fileData.ok) {
      throw new Error('Telegram API error');
    }
    
    const imageUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
    const image = await fetch(imageUrl);
    const imageBuffer = await image.arrayBuffer();
    
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(imageBuffer));
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
}

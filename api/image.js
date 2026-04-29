export default async function handler(req, res) {
  const { file_id } = req.query;
  
  if (!file_id) {
    return res.status(400).json({ error: 'Missing file_id' });
  }
  
  const BOT_TOKEN = '8209263425:AAFZQzJCzLmnV044UPaCWJWJZ3ZQw24H85k';
  
  try {
    // Получаем путь к файлу
    const fileInfo = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${file_id}`
    );
    const fileData = await fileInfo.json();
    
    if (!fileData.ok) {
      throw new Error('Telegram API error');
    }
    
    // Получаем картинку
    const imageUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
    const image = await fetch(imageUrl);
    const imageBuffer = await image.arrayBuffer();
    
    // Отдаём картинку
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // кеш на 1 день
    res.send(Buffer.from(imageBuffer));
    
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: error.message });
  }
}

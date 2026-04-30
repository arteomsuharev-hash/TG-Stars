export default async function handler(req, res) {
  const { file_id } = req.query;
  const BOT_TOKEN = '8209263425:AAFZQzJCzLmnV044UPaCWJWJZ3ZQw24H85k';

  if (!file_id) {
    return res.status(400).json({ error: 'Missing file_id' });
  }

  try {
    // Запрашиваем путь к файлу
    const getFileUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${file_id}`;
    const fileRes = await fetch(getFileUrl);
    const fileData = await fileRes.json();
    
    if (!fileData.ok) {
      console.error('Telegram getFile error:', fileData);
      return res.status(500).json({ error: 'Invalid file_id' });
    }
    
    // Скачиваем картинку
    const imageUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
    const imageRes = await fetch(imageUrl);
    const imageBuffer = await imageRes.arrayBuffer();
    
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(Buffer.from(imageBuffer));
    
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: err.message });
  }
}

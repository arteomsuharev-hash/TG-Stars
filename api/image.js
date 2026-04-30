export default async function handler(req, res) {
  const { file_id } = req.query;
  const BOT_TOKEN = '8209263425:AAFZQzJCzLmnV044UPaCWJWJZ3ZQw24H85k';

  if (!file_id) {
    return res.status(400).json({ error: 'Missing file_id' });
  }

  try {
    // Проверяем, что file_id работает
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${file_id}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.ok) {
      console.error('Telegram error for file_id:', file_id.substring(0, 30) + '...', data);
      return res.status(500).json({ error: 'Invalid file_id', details: data });
    }
    
    // Получаем картинку
    const imgUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;
    const imgRes = await fetch(imgUrl);
    const buffer = await imgRes.arrayBuffer();
    
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(Buffer.from(buffer));
    
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: err.message });
  }
}

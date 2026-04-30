export default async function handler(req, res) {
  const { file_id } = req.query;
  const BOT_TOKEN = '8209263425:AAFZQzJCzLmnV044UPaCWJWJZ3ZQw24H85k';

  if (!file_id) {
    return res.status(400).json({ error: 'Missing file_id' });
  }

  try {
    // Просто проверяем, что Bot API отвечает
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${file_id}`;
    const response = await fetch(url);
    const data = await response.json();
    
    // Возвращаем ответ Telegram для диагностики
    res.json({ 
      success: data.ok, 
      file_id: file_id,
      telegram_response: data 
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

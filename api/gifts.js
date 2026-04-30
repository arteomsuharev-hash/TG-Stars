// api/gifts.js - ТЕСТОВАЯ ВЕРСИЯ ДЛЯ ДИАГНОСТИКИ
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    // Возвращаем простое сообщение
    res.json({
      success: true,
      message: 'API is alive!',
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

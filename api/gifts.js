export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // Просто проверяем, что сервер жив
    res.json({ 
      success: true, 
      message: 'API работает',
      time: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

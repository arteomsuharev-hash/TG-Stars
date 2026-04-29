import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

// ===== ЗАМЕНИ ЭТИ ТРИ СТРОЧКИ =====
const apiId = 35428941;        // ЗАМЕНИ на свой НОВЫЙ api_id (который не публиковал)
const apiHash = 'ba211e1b4b260186488fe154a6ed7585'; // ЗАМЕНИ на свой НОВЫЙ api_hash
const PHONE_NUMBER = '+79941446614'; // ЗАМЕНИ на свой номер телефона с кодом страны
// =================================

// Сессия сохранится после первого входа (заменишь потом на реальную)
let sessionString = '';

export default async function handler(req, res) {
  // Разрешаем запросы с твоего сайта
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    console.log('🔄 Запуск MTProto клиента...');
    
    const client = new TelegramClient(
      new StringSession(sessionString),
      apiId,
      apiHash,
      { connectionRetries: 5 }
    );
    
    // Запускаем авторизацию
    await client.start({
      phoneNumber: async () => PHONE_NUMBER,
      password: async () => '',
      phoneCode: async () => {
        console.log('📱 Код подтверждения отправлен в Telegram');
        return await askCode();
      },
      onError: (err) => console.log('Ошибка:', err)
    });
    
    // Сохраняем сессию для следующих запусков
    const newSession = client.session.save();
    if (newSession && newSession !== sessionString) {
      sessionString = newSession;
      console.log('💾 Новая сессия:', sessionString.substring(0, 50) + '...');
    }
    
    // Получаем список подарков
    console.log('🎁 Запрашиваем список подарков...');
    const result = await client.invoke(new Api.payments.GetStarGifts({ hash: 0 }));
    
    // Форматируем ответ
    const gifts = result.gifts.map(gift => ({
      id: gift.id,
      name: gift.title,
      price: gift.stars,
      is_unique: !!(gift.attributes && gift.attributes.length),
      total_count: gift.totalCount,
      remaining_count: gift.remainingCount
    }));
    
    console.log(`✅ Успешно загружено ${gifts.length} подарков`);
    res.json({ success: true, count: gifts.length, gifts: gifts });
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      hint: 'Проверь api_id, api_hash и номер телефона'
    });
  }
}

// Функция для ввода кода подтверждения
function askCode() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    readline.question('Введите код из Telegram: ', (code) => {
      readline.close();
      resolve(code);
    });
  });
}

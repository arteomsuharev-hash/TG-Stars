const fs = require('fs');
const https = require('https');
const token = '8209263425:AAFZQzJCzLmnV044UPaCWJWJZ3ZQw24H85k';

const raw = JSON.parse(fs.readFileSync('gifts_raw.json', 'utf8'));
const gifts = raw.result.gifts;

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else {
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function getThumbnailUrl(fileId) {
  const url = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.ok) {
    return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
  }
  return null;
}

async function main() {
  const dir = './public/images/gifts';
  fs.mkdirSync(dir, { recursive: true });
  
  const results = [];
  
  for (const gift of gifts) {
    const thumbId = gift.sticker.thumbnail?.file_id || gift.sticker.file_id;
    const outputPath = `${dir}/${gift.id}.png`;
    
    try {
      const imageUrl = await getThumbnailUrl(thumbId);
      if (imageUrl) {
        await downloadFile(imageUrl, outputPath);
        console.log(`✅ ${gift.id}.png (${gift.star_count} ★)`);
        results.push({
          id: gift.id,
          name: `Gift ${gift.id.slice(-4)}`,
          price: gift.star_count,
          image_url: `/images/gifts/${gift.id}.png`,
          thumbnail_file_id: thumbId
        });
      } else {
        console.log(`❌ ${gift.id} — нет thumbnail`);
      }
    } catch (err) {
      console.log(`❌ ${gift.id} — ошибка:`, err.message);
    }
    
    // Пауза, чтобы не забанили
    await new Promise(r => setTimeout(r, 200));
  }
  
  // Сохраняем результат для API
  fs.writeFileSync('gifts_processed.json', JSON.stringify({ success: true, gifts: results }, null, 2));
  console.log(`\n✅ Готово! Скачано ${results.length} из ${gifts.length} подарков`);
  console.log('📁 PNG сохранены в /public/images/gifts/');
  console.log('📄 Данные для API в gifts_processed.json');
}

main().catch(console.error);

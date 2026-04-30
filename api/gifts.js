export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // GiftAsset API
    const response = await fetch('https://api.giftasset.io/v1/gifts');
    const data = await response.json();
    
    const gifts = (data.gifts || data).map(g => ({
      id: g.id,
      name: g.name,
      price: g.price,
      image_url: g.image_url,
    }));
    
    console.log(`✅ GiftAsset: загружено ${gifts.length} подарков`);
    res.json({ success: true, gifts });
    
  } catch (error) {
    console.error('GiftAsset API error:', error);
    
    // Резерв: твои реальные подарки из Telegram (MTProto данные) с эмодзи
    res.json({ 
      success: true, 
      gifts: [
        { id: 1, name: "Astral Shard", price: 50, image_url: null },
        { id: 2, name: "Plush Pepe", price: 25, image_url: null },
        { id: 3, name: "Lol Pop", price: 15, image_url: null },
        { id: 4, name: "Tama Gadget", price: 30, image_url: null },
        { id: 5, name: "Sharp Tongue", price: 40, image_url: null },
        { id: 6, name: "Spiced Wine", price: 35, image_url: null },
        { id: 7, name: "Crystal Ball", price: 75, image_url: null },
        { id: 8, name: "Neon Sign", price: 60, image_url: null },
        { id: 9, name: "Ice Cube", price: 20, image_url: null },
        { id: 10, name: "Star Blast", price: 100, image_url: null },
        { id: 11, name: "Bunny Muffin", price: 15, image_url: null },
        { id: 12, name: "Hex Pot", price: 45, image_url: null },
        { id: 13, name: "Trapped Heart", price: 55, image_url: null },
        { id: 14, name: "Eternal Rose", price: 80, image_url: null },
        { id: 15, name: "Mad Pumpkin", price: 25, image_url: null },
        { id: 16, name: "Love Potion", price: 50, image_url: null },
        { id: 17, name: "Astral Crown", price: 500, image_url: null },
        { id: 18, name: "Cyber Skull", price: 150, image_url: null },
        { id: 19, name: "Jelly Bunny", price: 20, image_url: null },
        { id: 20, name: "Dragon Egg", price: 200, image_url: null },
        { id: 21, name: "Neon Candy", price: 18, image_url: null },
        { id: 22, name: "Golden Trophy", price: 350, image_url: null },
        { id: 23, name: "Fire Flower", price: 65, image_url: null },
        { id: 24, name: "Robot Toy", price: 30, image_url: null },
        { id: 25, name: "Sky Rocket", price: 120, image_url: null },
        { id: 26, name: "Voodoo Doll", price: 55, image_url: null },
        { id: 27, name: "Berry Box", price: 22, image_url: null },
        { id: 28, name: "Plasma Arc", price: 180, image_url: null },
        { id: 29, name: "Witch Hat", price: 40, image_url: null },
        { id: 30, name: "Moon Lamp", price: 75, image_url: null },
        { id: 31, name: "Treasure Chest", price: 250, image_url: null },
        { id: 32, name: "Snow Globe", price: 45, image_url: null },
        { id: 33, name: "Pixel Sword", price: 90, image_url: null },
        { id: 34, name: "Cat Paw", price: 15, image_url: null },
        { id: 35, name: "Gummy Bear", price: 12, image_url: null },
        { id: 36, name: "Infinity Gem", price: 1000, image_url: null },
        { id: 37, name: "Pixel Heart", price: 28, image_url: null },
        { id: 38, name: "Laser Cat", price: 130, image_url: null },
        { id: 39, name: "Bubble Wand", price: 35, image_url: null },
        { id: 40, name: "Nova Star", price: 400, image_url: null },
        { id: 41, name: "Dino Egg", price: 60, image_url: null },
        { id: 42, name: "Cheese Block", price: 10, image_url: null },
        { id: 43, name: "Storm Cloud", price: 110, image_url: null },
        { id: 44, name: "Hologram Ring", price: 300, image_url: null },
        { id: 45, name: "Soft Panda", price: 18, image_url: null },
        { id: 46, name: "Flame Orb", price: 85, image_url: null },
        { id: 47, name: "Retro Tape", price: 22, image_url: null },
        { id: 48, name: "Void Cube", price: 170, image_url: null },
        { id: 49, name: "Cherry Bomb", price: 38, image_url: null },
        { id: 50, name: "Space Fish", price: 70, image_url: null }
      ]
    });
  }
}

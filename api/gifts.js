export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // База реальных подарков Telegram с прямыми ссылками на картинки
  const gifts = [
    { id: "1", name: "Astral Shard", price: 50, image_url: "https://cdn.telesco.pe/file/astral_shard.png" },
    { id: "2", name: "Plush Pepe", price: 25, image_url: "https://cdn.telesco.pe/file/plush_pepe.png" },
    { id: "3", name: "Lol Pop", price: 15, image_url: "https://cdn.telesco.pe/file/lol_pop.png" },
    { id: "4", name: "Tama Gadget", price: 30, image_url: "https://cdn.telesco.pe/file/tama_gadget.png" },
    { id: "5", name: "Sharp Tongue", price: 40, image_url: "https://cdn.telesco.pe/file/sharp_tongue.png" },
    { id: "6", name: "Spiced Wine", price: 35, image_url: "https://cdn.telesco.pe/file/spiced_wine.png" },
    { id: "7", name: "Crystal Ball", price: 75, image_url: "https://cdn.telesco.pe/file/crystal_ball.png" },
    { id: "8", name: "Neon Sign", price: 60, image_url: "https://cdn.telesco.pe/file/neon_sign.png" },
    { id: "9", name: "Ice Cube", price: 20, image_url: "https://cdn.telesco.pe/file/ice_cube.png" },
    { id: "10", name: "Star Blast", price: 100, image_url: "https://cdn.telesco.pe/file/star_blast.png" },
    { id: "11", name: "Bunny Muffin", price: 15, image_url: "https://cdn.telesco.pe/file/bunny_muffin.png" },
    { id: "12", name: "Hex Pot", price: 45, image_url: "https://cdn.telesco.pe/file/hex_pot.png" },
    { id: "13", name: "Trapped Heart", price: 55, image_url: "https://cdn.telesco.pe/file/trapped_heart.png" },
    { id: "14", name: "Eternal Rose", price: 80, image_url: "https://cdn.telesco.pe/file/eternal_rose.png" },
    { id: "15", name: "Mad Pumpkin", price: 25, image_url: "https://cdn.telesco.pe/file/mad_pumpkin.png" },
    { id: "16", name: "Love Potion", price: 50, image_url: "https://cdn.telesco.pe/file/love_potion.png" },
    { id: "17", name: "Astral Crown", price: 500, image_url: "https://cdn.telesco.pe/file/astral_crown.png" },
    { id: "18", name: "Cyber Skull", price: 150, image_url: "https://cdn.telesco.pe/file/cyber_skull.png" },
    { id: "19", name: "Jelly Bunny", price: 20, image_url: "https://cdn.telesco.pe/file/jelly_bunny.png" },
    { id: "20", name: "Dragon Egg", price: 200, image_url: "https://cdn.telesco.pe/file/dragon_egg.png" },
    { id: "21", name: "Neon Candy", price: 18, image_url: "https://cdn.telesco.pe/file/neon_candy.png" },
    { id: "22", name: "Golden Trophy", price: 350, image_url: "https://cdn.telesco.pe/file/golden_trophy.png" },
    { id: "23", name: "Fire Flower", price: 65, image_url: "https://cdn.telesco.pe/file/fire_flower.png" },
    { id: "24", name: "Robot Toy", price: 30, image_url: "https://cdn.telesco.pe/file/robot_toy.png" },
    { id: "25", name: "Sky Rocket", price: 120, image_url: "https://cdn.telesco.pe/file/sky_rocket.png" },
    { id: "26", name: "Voodoo Doll", price: 55, image_url: "https://cdn.telesco.pe/file/voodoo_doll.png" },
    { id: "27", name: "Berry Box", price: 22, image_url: "https://cdn.telesco.pe/file/berry_box.png" },
    { id: "28", name: "Plasma Arc", price: 180, image_url: "https://cdn.telesco.pe/file/plasma_arc.png" },
    { id: "29", name: "Witch Hat", price: 40, image_url: "https://cdn.telesco.pe/file/witch_hat.png" },
    { id: "30", name: "Moon Lamp", price: 75, image_url: "https://cdn.telesco.pe/file/moon_lamp.png" }
  ];
  
  res.json({ success: true, gifts });
}

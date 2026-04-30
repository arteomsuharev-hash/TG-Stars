import { getClient } from "../lib/mtproto-client.js";
import { Api } from "telegram";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  
  try {
    const client = await getClient();
    const result = await client.invoke(new Api.payments.GetStarGifts({ hash: 0 }));
    
    const gifts = result.gifts.map(g => ({
      id: g.id.toString(),
      name: g.title,
      price: g.stars,
      is_unique: !!(g.attributes?.length),
      sticker: g.sticker ? { id: g.sticker.id, accessHash: g.sticker.accessHash, dcId: g.sticker.dcId } : null,
      background: g.background ? { center_color: g.background.center_color, edge_color: g.background.edge_color } : null,
      attributes: g.attributes || null,
    }));
    
    res.json({ success: true, gifts });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

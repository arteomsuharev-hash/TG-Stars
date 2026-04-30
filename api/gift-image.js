import { composeRegularGift, composeUniqueGift } from "../lib/compose-gift.js";

export const config = {
  api: { bodyParser: true },
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const gift = req.body;
    let imageBuffer;

    if (gift.attributes && Array.isArray(gift.attributes)) {
      imageBuffer = await composeUniqueGift(gift);
    } else if (gift.sticker && gift.background) {
      imageBuffer = await composeRegularGift(gift);
    } else {
      return res.status(400).json({ error: "Неизвестный формат подарка" });
    }

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(imageBuffer);
  } catch (err) {
    console.error("Gift render error:", err);
    res.status(500).json({ error: err.message });
  }
}

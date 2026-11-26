import { Router } from "express";

const router = Router();
let cached = { value: null, expiresAt: 0 };

router.get("/quotes", async (_req, res) => {
  if (cached.value && cached.expiresAt > Date.now()) {
    return res.json({ ...cached.value, cached: true });
  }
  const apiKey = process.env.CMC_API_KEY;
  if (!apiKey) return res.status(503).json({ message: "Market price feed is not configured.", data: { BNB: null, APM: null } });

  try {
    const response = await fetch("https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BNB&convert=USD", {
      headers: { "X-CMC_PRO_API_KEY": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`CoinMarketCap returned HTTP ${response.status}`);
    const payload = await response.json();
    const bnb = payload?.data?.BNB?.quote?.USD;
    if (!bnb || typeof bnb.price !== "number") throw new Error("CoinMarketCap response did not include a valid BNB quote.");

    const result = {
      currency: "USD",
      updatedAt: new Date().toISOString(),
      data: {
        BNB: { price: bnb.price, change24h: bnb.percent_change_24h },
        // APM is intentionally null until an independently verifiable market listing/price source exists.
        APM: null
      }
    };
    cached = { value: result, expiresAt: Date.now() + 60_000 };
    return res.json({ ...result, cached: false });
  } catch (error) {
    console.error("Market quote provider error:", error.message);
    if (cached.value) return res.json({ ...cached.value, cached: true, stale: true });
    return res.status(502).json({ message: "Market price provider is temporarily unavailable." });
  }
});

export default router;

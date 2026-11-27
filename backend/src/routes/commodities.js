import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getRegionalCommodityPrices, getGlobalCommodityPrices, convertRegionalPricesToCurrency } from "../services/commodityPrices.js";

const router = Router();
const cache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;

router.get("/regional", requireAuth, async (req, res) => {
  const { country, state, currencyCode } = req.user;
  if (!country) return res.status(400).json({ message:"Set your country in your APM profile to view regional commodity prices." });
  const key = [country,state,currencyCode].join("|").toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json({ ...await convertRegionalPricesToCurrency(cached.value,currencyCode), cached:true });
  }
  try {
    const data = await getRegionalCommodityPrices({ country, state, currencyCode });
    cache.set(key,{ value:data, expiresAt:Date.now()+CACHE_TTL_MS });
    return res.json({ ...await convertRegionalPricesToCurrency(data,currencyCode), cached:false });
  } catch (error) {
    console.error("Regional commodity price provider error:",error.message);
    if (cached) return res.json({ ...await convertRegionalPricesToCurrency(cached.value,currencyCode), cached:true, stale:true });
    return res.status(502).json({ message:"Regional commodity prices are temporarily unavailable. Please try again later." });
  }
});


router.get("/global", async (_req,res) => {
  const key = "global-benchmarks-usd";
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return res.json({ ...cached.value,cached:true });
  try {
    const data = await getGlobalCommodityPrices();
    cache.set(key,{value:data,expiresAt:Date.now()+60*60*1000});
    return res.json({...data,cached:false});
  } catch(error) {
    console.error("Global commodity benchmark provider error:",error.message);
    if(cached) return res.json({...cached.value,cached:true,stale:true});
    return res.status(502).json({message:"Global commodity benchmarks are temporarily unavailable. Please try again later."});
  }
});

export default router;

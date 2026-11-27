import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import marketRoutes from "../src/routes/market.js";

test("market quotes return validated BNB/USD data, keep APM unpriced, and cache briefly", async () => {
  const previousKey = process.env.CMC_API_KEY;
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  process.env.CMC_API_KEY = "test-cmc-key";
  globalThis.fetch = async (url, options) => {
    upstreamCalls += 1;
    assert.match(String(url), /symbol=BNB&convert=USD/);
    assert.equal(options.headers["X-CMC_PRO_API_KEY"], "test-cmc-key");
    return { ok: true, json: async () => ({ data: { BNB: { quote: { USD: { price: 612.34, percent_change_24h: 1.25 } } } } }) };
  };
  const app = express();
  app.use("/api/market", marketRoutes);
  const server = app.listen(0);
  await once(server, "listening");
  const url = "http://127.0.0.1:" + server.address().port + "/api/market/quotes";
  try {
    const first = await fetch(url);
    assert.equal(first.status, 200);
    const firstBody = await first.json();
    assert.equal(firstBody.data.BNB.price, 612.34);
    assert.equal(firstBody.data.BNB.change24h, 1.25);
    assert.equal(firstBody.data.APM, null);
    assert.equal(firstBody.cached, false);
    const second = await fetch(url);
    assert.equal(second.status, 200);
    const secondBody = await second.json();
    assert.equal(secondBody.cached, true);
    assert.equal(secondBody.data.BNB.price, 612.34);
    assert.equal(upstreamCalls, 1);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.CMC_API_KEY;
    else process.env.CMC_API_KEY = previousKey;
  }
});

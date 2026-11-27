import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import marketRoutes from "../src/routes/market.js";

async function withMarketServer(run) {
  const app = express();
  app.use("/api/market", marketRoutes);
  const server = app.listen(0);
  await once(server, "listening");
  const url = "http://127.0.0.1:" + server.address().port + "/api/market/quotes";
  try {
    await run(url);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test("market quotes return 503 when the provider is not configured", async () => {
  const previousKey = process.env.CMC_API_KEY;
  const originalFetch = globalThis.fetch;
  delete process.env.CMC_API_KEY;
  globalThis.fetch = async () => {
    throw new Error("Fetch must not run without a configured API key");
  };
  try {
    await withMarketServer(async url => {
      const response = await originalFetch(url);
      assert.equal(response.status, 503);
      const body = await response.json();
      assert.equal(body.data.BNB, null);
      assert.equal(body.data.APM, null);
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.CMC_API_KEY;
    else process.env.CMC_API_KEY = previousKey;
  }
});

test("market quotes return a safe 502 response when the provider fails", async () => {
  const previousKey = process.env.CMC_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.CMC_API_KEY = "test-cmc-key";
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith("http://127.0.0.1:")) return originalFetch(url, options);
    return { ok: false, status: 503 };
  };
  try {
    await withMarketServer(async url => {
      const response = await originalFetch(url);
      assert.equal(response.status, 502);
      assert.deepEqual(await response.json(), {
        message: "Market price provider is temporarily unavailable."
      });
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.CMC_API_KEY;
    else process.env.CMC_API_KEY = previousKey;
  }
});

test("market quotes reject zero or negative provider prices", async () => {
  const previousKey = process.env.CMC_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.CMC_API_KEY = "test-cmc-key";
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith("http://127.0.0.1:")) return originalFetch(url, options);
    return {
      ok: true,
      json: async () => ({ data: { BNB: { quote: { USD: { price: -1, percent_change_24h: 1 } } } } })
    };
  };
  try {
    await withMarketServer(async url => {
      const response = await originalFetch(url);
      assert.equal(response.status, 502);
      assert.deepEqual(await response.json(), {
        message: "Market price provider is temporarily unavailable."
      });
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.CMC_API_KEY;
    else process.env.CMC_API_KEY = previousKey;
  }
});

test("market quotes return validated BNB/USD data, keep APM unpriced, and cache briefly", async () => {
  const previousKey = process.env.CMC_API_KEY;
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  process.env.CMC_API_KEY = "test-cmc-key";
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith("http://127.0.0.1:")) return originalFetch(url, options);
    upstreamCalls += 1;
    assert.match(String(url), /symbol=BNB&convert=USD/);
    assert.equal(options.headers["X-CMC_PRO_API_KEY"], "test-cmc-key");
    return { ok: true, json: async () => ({ data: { BNB: { quote: { USD: { price: 612.34, percent_change_24h: 1.25 } } } } }) };
  };
  try {
    await withMarketServer(async url => {
      const first = await originalFetch(url);
      assert.equal(first.status, 200);
      const firstBody = await first.json();
      assert.equal(firstBody.data.BNB.price, 612.34);
      assert.equal(firstBody.data.BNB.change24h, 1.25);
      assert.equal(firstBody.data.APM, null);
      assert.equal(firstBody.cached, false);
      const second = await originalFetch(url);
      assert.equal(second.status, 200);
      const secondBody = await second.json();
      assert.equal(secondBody.cached, true);
      assert.equal(secondBody.data.BNB.price, 612.34);
      assert.equal(upstreamCalls, 1);
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.CMC_API_KEY;
    else process.env.CMC_API_KEY = previousKey;
  }
});

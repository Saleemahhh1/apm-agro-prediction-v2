import { useEffect, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export default function useMarketQuotes() {
  const [quotes, setQuotes] = useState({ BNB: null, APM: null });
  const [status, setStatus] = useState("Connecting");
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(API_BASE + "/api/market/quotes", { headers: { Accept: "application/json" } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Market feed unavailable");
        if (!active) return;
        setQuotes({ BNB: payload.data?.BNB || null, APM: payload.data?.APM || null });
        setUpdatedAt(payload.updatedAt || null);
        setStatus(payload.stale ? "Delayed data" : "Live feed");
      } catch {
        if (active) setStatus("Feed unavailable");
      }
    };
    load();
    const timer = setInterval(load, 60_000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  return { quotes, status, updatedAt };
}

export function formatUsd(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 6 : 2 }).format(value);
}

import React, { useCallback, useEffect, useState } from "react";
import { authApi } from "../utils/authApi";
import PriceHistorySparkline from "./PriceHistorySparkline";

function formatPrice(record) {
  const hasConvertedPrice = record.convertedPrice !== null && record.convertedPrice !== undefined && Number.isFinite(Number(record.convertedPrice));
  const amount = hasConvertedPrice ? Number(record.convertedPrice) : record.price;
  const code = record.displayCurrency || record.currency;
  if (code && /^[A-Z]{3}$/.test(code)) {
    try {
      return new Intl.NumberFormat(undefined,{style:"currency",currency:code,maximumFractionDigits:2}).format(amount);
    } catch { /* fall through to the source value */ }
  }
  return `${Number(amount).toLocaleString(undefined,{maximumFractionDigits:2})} ${code || "currency not specified"}`.trim();
}

function isOld(date) {
  const parsed = Date.parse(date);
  return !Number.isFinite(parsed) || Date.now() - parsed > 90 * 24 * 60 * 60 * 1000;
}

export default function RegionalCommodityPrices({ profile }) {
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");

  const load = useCallback(async () => {
    if (!profile?.country) return;
    setLoading(true); setError("");
    try {
      setData(await authApi.regionalCommodityPrices());
    } catch (err) {
      setError(err?.message || "Regional prices are temporarily unavailable.");
    } finally { setLoading(false); }
  },[profile?.country,profile?.state,profile?.currencyCode]);

  useEffect(()=>{ load(); },[load]);

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-apmGreen/20 bg-gradient-to-br from-[#0e1d17] via-[#10151b] to-[#11170f] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-apmGreen">REGIONAL MARKET INTELLIGENCE</p>
          <h2 className="mt-1 text-lg font-bold text-white">Current Commodity Prices</h2>
          <p className="mt-1 text-xs text-white/50">{profile?.state ? `${profile.state}, ${profile.country}` : profile?.country || "Your region"} · Converted to your profile currency when a verified FX quote is available; original source prices remain identifiable</p>
        </div>
        <button type="button" onClick={load} disabled={loading || !profile?.country} className="rounded-lg border border-apmGreen/30 px-3 py-2 text-xs font-semibold text-apmGreen transition hover:bg-apmGreen/10 disabled:opacity-50">{loading ? "Updating…" : "Refresh prices"}</button>
      </div>

      {loading && !data ? <p className="mt-5 text-sm text-white/50">Loading verified market observations…</p> : null}
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-100">{error}</p>}
      {!profile?.country && <p className="mt-4 text-sm text-white/50">Add your country to your APM profile to view regional market prices.</p>}

      {data && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {data.commodities?.map(item => {
              const record = item.records?.[0];
              const stale = record && isOld(record.date);
              return (
                <article key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-white">{item.label}</h3>
                    <span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${record ? (stale ? "bg-apmGold/10 text-apmGold" : "bg-apmGreen/10 text-apmGreen") : "bg-white/5 text-white/40"}`}>{record ? (stale ? "Older data" : "Available") : "No feed"}</span>
                  </div>
                  {record ? (
                    <>
                      <p className="mt-3 text-xl font-extrabold text-apmGold">{formatPrice(record)}</p>
                      <p className="mt-1 text-[10px] text-white/45">per {record.unit}</p>
                      {record.convertedPrice != null && record.originalCurrency && record.originalCurrency !== record.displayCurrency && <p className="mt-1 text-[10px] text-white/40">Source: {Number(record.originalPrice).toLocaleString(undefined,{maximumFractionDigits:2})} {record.originalCurrency} · FX date: {record.fxDate || "same currency"}</p>}
                      {record.convertedPrice == null && <p className="mt-1 text-[10px] text-apmGold/70">Showing original source currency; conversion quote unavailable.</p>}
                      <PriceHistorySparkline history={record.history} valueKey="price" stroke="#39c77a" />
                      <div className="mt-3 border-t border-white/10 pt-2 text-[10px] leading-5 text-white/50">
                        <p>{record.market}</p>
                        <p>{record.priceType} · {record.date}</p>
                      </div>
                    </>
                  ) : <p className="mt-3 min-h-16 text-[11px] leading-5 text-white/45">{item.message || "No verified price observation is available yet."}</p>}
                </article>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-white/40">
            <span>Currency conversion: {({complete:"All source currencies converted",partial:"Some currencies converted; original prices retained where unavailable",unavailable:"FX service unavailable; showing original source prices",not_applicable:"No conversion needed"})[data.fxStatus] || "Conversion status unavailable"}</span>
            <span>Source: FAO GIEWS Food Price Monitoring and Analysis (FPMA)</span>
            <a href={data.sourceUrl} target="_blank" rel="noreferrer" className="text-apmGreen hover:underline">View source data ↗</a>
            <span>Latest observation: {data.updatedAt || "Not available"} · {data.cached ? "Cached" : "Retrieved now"}</span>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-white/35">These are the latest published market observations, not guaranteed live quotes. Prices may be weekly or monthly and can differ by market, grade and unit. Currency conversion uses daily reference exchange rates, not live trading quotes. Original market prices and source currency are retained. Fertilizer is shown as unavailable until a verified local source is connected.</p>
        </>
      )}
    </section>
  );
}

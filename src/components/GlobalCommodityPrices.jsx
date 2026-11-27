import React,{useCallback,useEffect,useState} from "react";
import {authApi} from "../utils/authApi";

export default function GlobalCommodityPrices(){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{setData(await authApi.globalCommodityPrices());}
    catch(err){setError(err?.message||"Global benchmark prices are temporarily unavailable.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);

  return(
    <section className="mb-8 overflow-hidden rounded-2xl border border-apmGold/20 bg-gradient-to-br from-[#17160f] via-[#11151b] to-[#101b17] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-apmGold">GLOBAL MARKET INTELLIGENCE · USD</p>
          <h2 className="mt-1 text-lg font-bold text-white">International Commodity Benchmarks</h2>
          <p className="mt-1 text-xs text-white/50">International export-market observations shown in US dollars.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="rounded-lg border border-apmGold/30 px-3 py-2 text-xs font-semibold text-apmGold transition hover:bg-apmGold/10 disabled:opacity-50">{loading?"Updating…":"Refresh benchmarks"}</button>
      </div>
      {error&&<p role="alert" className="mt-4 rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-100">{error}</p>}
      {!data&&loading&&<p className="mt-5 text-sm text-white/50">Loading international benchmark observations…</p>}
      {data&&<>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {data.commodities?.map(item=>{
            const record=item.records?.[0];
            return <article key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3.5">
              <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-white">{item.label}</h3><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${record?"bg-apmGold/10 text-apmGold":"bg-white/5 text-white/40"}`}>{record?"Benchmark":"No feed"}</span></div>
              {record?<><p className="mt-3 text-xl font-extrabold text-apmGold">{new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(record.priceUSD)}</p><p className="mt-1 text-[10px] text-white/45">per {record.unit}</p><div className="mt-3 border-t border-white/10 pt-2 text-[10px] leading-5 text-white/50"><p>{record.market}</p><p>{record.date} · {record.periodicity}</p></div></>:<p className="mt-3 min-h-16 text-[11px] leading-5 text-white/45">{item.message||"No verified international series is available."}</p>}
            </article>;
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-white/40">
          <span>Source: FAO GIEWS FPMA International Prices</span>
          <a href={data.sourceUrl} target="_blank" rel="noreferrer" className="text-apmGold hover:underline">View source data ↗</a>
          <span>Latest observation: {data.updatedAt||"Not available"} · {data.cached?"Cached":"Retrieved now"}</span>
        </div>
        <p className="mt-2 text-[10px] leading-4 text-white/35">These are selected international market benchmarks, not one universal retail price. Local prices may differ because of transport, taxes, quality, market conditions and exchange rates. Fertilizer remains unavailable until a verified global fertilizer feed is integrated.</p>
      </>}
    </section>
  );
}

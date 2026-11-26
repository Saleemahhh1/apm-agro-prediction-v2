import React from "react";
import { formatUsd } from "../utils/useMarketQuotes";

/**
 * Decorative animated globe for the global-market ticker.
 * Price values are intentionally not fabricated: connect this component to
 * the backend market-data endpoint when the API is deployed.
 */
export default function GlobeTicker({ className = "", quotes = {}, status = "Connecting", updatedAt = null }) {
  const bnbPrice = quotes.BNB?.price != null ? formatUsd(quotes.BNB.price) : "BNB —";
  const apmPrice = quotes.APM?.price != null ? formatUsd(quotes.APM.price) : "APM not listed";
  return (
    <div className={`relative flex min-h-[76px] items-center gap-3 overflow-hidden rounded-2xl border border-apmGreen/20 bg-gradient-to-r from-[#07150f] via-[#10180f] to-[#171307] px-4 py-3 shadow-[0_12px_34px_rgba(0,0,0,.24)] ${className}`}>
      <div className="pointer-events-none absolute inset-0 opacity-50" style={{backgroundImage:"radial-gradient(rgba(0,200,83,.18) 1px, transparent 1px)",backgroundSize:"17px 17px"}} />
      <div className="relative grid h-12 w-12 shrink-0 place-items-center">
        <div className="absolute inset-0 rounded-full border border-apmGreen/40 animate-spin-slow" />
        <div className="absolute inset-1 rounded-full border border-dashed border-apmGold/35 animate-spin-slow" style={{animationDirection:"reverse"}} />
        <div className="absolute inset-0 rounded-full bg-apmGreen/10 blur-md animate-ticker-glow" />
        <svg viewBox="0 0 48 48" role="img" aria-label="Global market" className="relative h-9 w-9 text-apmGreen">
          <circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <ellipse cx="24" cy="24" rx="8" ry="17" fill="none" stroke="currentColor" strokeWidth="1" opacity=".8" />
          <path d="M7 24h34M11 15h26M11 33h26" fill="none" stroke="currentColor" strokeWidth="1" opacity=".75" />
          <path d="M16 12c4 4 5 8 5 12s-1 8-5 12M32 12c-4 4-5 8-5 12s1 8 5 12" fill="none" stroke="currentColor" strokeWidth="1" opacity=".45" />
          <circle cx="34" cy="16" r="2" fill="#FFD700" />
        </svg>
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[.2em] text-apmGold">Global market pulse</span>
          <span className="h-1 w-1 rounded-full bg-apmGreen shadow-[0_0_8px_#00C853]" />
          <span className="text-[10px] text-white/45">APM Agro Network</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-white/75 sm:text-sm">Connecting agricultural insight with global prediction markets.</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-white/65"><span>{bnbPrice}</span><span>{apmPrice}</span></div>
      </div>
      <div className="relative hidden shrink-0 text-right sm:block">
        <span className="block text-[9px] uppercase tracking-widest text-white/35">Market data</span>
        <span className="text-xs font-semibold text-apmGreen">{status}</span>
        {updatedAt && <span className="mt-1 block text-[9px] text-white/35">{new Date(updatedAt).toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}

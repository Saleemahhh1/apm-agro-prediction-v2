import React from "react";
import clsx from "clsx";
import WalletButton from "./WalletButton";
import GlobeTicker from "./GlobeTicker";
import useMarketQuotes, { formatUsd } from "../utils/useMarketQuotes";

export default function Header({ isBNBPrimary, authed, account, onConnectWallet, onGetStarted, onLogout }) {
  const { quotes, status, updatedAt } = useMarketQuotes();
  return (
    <header className="apm-header sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-5 lg:flex-nowrap lg:px-8">
        <a href="/" aria-label="APM Agro home" className="flex min-w-0 items-center gap-3">
          <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-apmGreen/40 bg-gradient-to-br from-apmGreen/20 to-bnbYellow/10 shadow-[0_0_24px_rgba(0,200,83,.14)] sm:h-12 sm:w-12">
            <span className="text-xl sm:text-2xl" aria-hidden="true">🌿</span>
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a0a0a] bg-apmGreen" />
          </div>
          <div className="min-w-0">
            <h1 className="whitespace-nowrap text-lg font-extrabold tracking-wide sm:text-xl">
              <span className={clsx(isBNBPrimary ? "text-bnbYellow" : "text-apmGreen")}>APM</span>
              <span className="text-white/65">-</span>
              <span className={clsx(!isBNBPrimary ? "text-bnbYellow" : "text-apmGreen")}>agro</span>
            </h1>
            <p className="hidden truncate text-[10px] tracking-[.12em] text-white/45 sm:block">TURNING LOCAL INSIGHTS INTO GLOBAL INTELLIGENCE</p>
          </div>
        </a>

        <div className="order-3 flex w-full items-center justify-center gap-2 sm:gap-3 lg:order-none lg:w-auto">
          <MarketTicker symbol="BNB" label="BNB" accent="bnb" primary={isBNBPrimary} quote={quotes.BNB} status={status} />
          <MarketTicker symbol="APM" label="APM TOKEN" accent="apm" primary={!isBNBPrimary} quote={quotes.APM} status={status} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {!authed ? (
            <button onClick={onGetStarted} className="rounded-xl bg-apmGold px-3 py-2 text-xs font-bold text-darkBg shadow-[0_4px_18px_rgba(255,215,0,.14)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-apmGold/60 sm:px-4 sm:text-sm">Get Started</button>
          ) : (
            <button onClick={onLogout} className="rounded-xl border border-apmGold/60 px-3 py-2 text-xs font-semibold text-apmGold transition hover:bg-apmGold/10 focus:outline-none focus:ring-2 focus:ring-apmGold/50 sm:px-4 sm:text-sm">Logout</button>
          )}
          <WalletButton account={account} onConnect={onConnectWallet} />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1440px] px-3 pb-3 sm:px-5 lg:px-8"><GlobeTicker quotes={quotes} status={status} updatedAt={updatedAt} /></div>
    </header>
  );
}

function MarketTicker({ symbol, label, accent, primary, quote, status }) {
  const isBnb = accent === "bnb";
  const price = quote?.price != null ? formatUsd(quote.price) : (isBnb ? "—" : "Not listed");
  return (
    <div className={clsx(
      "group relative flex min-w-0 items-center gap-2 overflow-hidden rounded-xl border px-3 py-2 transition-all duration-300 sm:gap-3 sm:px-4",
      isBnb ? "border-bnbYellow/25 bg-bnbYellow/[0.06]" : "border-apmGreen/25 bg-apmGreen/[0.06]",
      primary && "shadow-[0_0_22px_rgba(0,200,83,.10)]"
    )}>
      <span className={clsx("relative grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-black", isBnb ? "bg-bnbYellow/15 text-bnbYellow" : "bg-apmGreen/15 text-apmGreen")}>
        {isBnb ? "◆" : "A"}
        <span className={clsx("absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-[#0a0a0a]", isBnb ? "bg-bnbYellow" : "bg-apmGreen", primary && "animate-pulse")} />
      </span>
      <div className="min-w-0 leading-tight">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-white sm:text-sm">{symbol}</span>
          <span className="hidden text-[9px] tracking-wider text-white/40 sm:inline">{label}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-[10px] text-white/45">{price}</span>
          <span className={clsx("h-1 w-1 rounded-full", isBnb ? "bg-bnbYellow/70" : "bg-apmGreen/70")} />
          <span className="text-[10px] text-white/55">{status}</span>
        </div>
      </div>
      <div className={clsx("pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-20deg] opacity-0 transition duration-700 group-hover:left-full group-hover:opacity-100", isBnb ? "bg-bnbYellow/10" : "bg-apmGreen/10")} />
    </div>
  );
}

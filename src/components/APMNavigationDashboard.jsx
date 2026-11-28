import React, { useMemo, useState } from "react";
import RegionalCommodityPrices from "./RegionalCommodityPrices";
import GlobalCommodityPrices from "./GlobalCommodityPrices";
import WalletSecurityCenter from "./WalletSecurityCenter";
import AIHelper from "./aiHelper";

const ITEMS = [
  { id: "profile", title: "My Profile", description: "Your personal and account information", icon: "👤" },
  { id: "regional", title: "Current Commodity Price", description: "Regional commodity prices and market observations", icon: "🌾" },
  { id: "global", title: "Global Commodity Benchmark", description: "International commodity benchmarks", icon: "🌍" },
  { id: "ai", title: "AI Assistant", description: "Agricultural market questions and insights", icon: "✦" },
  { id: "watchlist", title: "Watchlist", description: "Keep track of favorite commodities and markets", icon: "☆" },
  { id: "explorer", title: "Explorer", description: "Check blockchain transaction status", icon: "⌕" },
  { id: "private", title: "Account & Private", description: "Wallet ownership, recovery guidance and account security", icon: "🔐" },
  { id: "notifications", title: "Notifications & Alerts", description: "Your market and account alert preferences", icon: "🔔" }
];

function ProfilePanel({ profile, account }) {
  return <div className="grid gap-3 sm:grid-cols-2">
    {[["Full name", profile?.fullName], ["Email", profile?.email], ["Country", profile?.country], ["Region / State", profile?.state], ["Account wallet", profile?.walletAddress || account], ["Currency", profile?.currencyCode]].map(([label, value]) =>
      <div key={label} className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p><p className="mt-2 break-all text-sm font-semibold text-white">{value || "Not provided / not connected"}</p></div>
    )}
  </div>;
}

function WatchlistPanel({ account, markets }) {
  const storageKey = "apm-watchlist:" + (account || "email-account");
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch { return []; }
  });
  const [item, setItem] = useState("");
  const save = next => { setSaved(next); localStorage.setItem(storageKey, JSON.stringify(next)); };
  const add = event => {
    event.preventDefault();
    const value = item.trim();
    if (!value || saved.some(entry => entry.toLowerCase() === value.toLowerCase())) return;
    save([...saved, value]); setItem("");
  };
  return <div className="space-y-4">
    <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
      <input value={item} onChange={event => setItem(event.target.value)} placeholder="Add a commodity or prediction market to follow" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#080d17] px-4 py-3 text-sm text-white outline-none focus:border-apmGreen/50" />
      <button className="rounded-xl bg-apmGreen px-5 py-3 text-sm font-bold text-[#07120c]">Add to watchlist</button>
    </form>
    {saved.length ? <div className="grid gap-2 sm:grid-cols-2">{saved.map(entry => <div key={entry} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3"><span className="min-w-0 break-words text-sm text-white">{entry}</span><button onClick={() => save(saved.filter(value => value !== entry))} className="shrink-0 text-xs text-red-300 hover:text-red-200">Remove</button></div>)}</div> : <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-white/45">Your watchlist is empty. Add commodities or prediction-market names to keep them here on this device.</p>}
    <p className="text-[11px] leading-5 text-white/35">This first version stores watchlist entries locally in this browser. It is not yet synchronized across devices or linked to live price alerts.</p>
    {markets?.length > 0 && <div><h3 className="mb-2 text-sm font-semibold text-white/75">Available prediction markets</h3><div className="space-y-2">{markets.slice(0, 6).map(market => <button key={market.id} onClick={() => { if (!saved.includes(market.question)) save([...saved, market.question]); }} className="block w-full rounded-lg border border-white/10 p-3 text-left text-xs text-white/70 hover:border-apmGreen/40">＋ {market.question}</button>)}</div></div>}
  </div>;
}

function ExplorerPanel() {
  const [hash, setHash] = useState("");
  const [network, setNetwork] = useState("testnet");
  const validHash = /^0x[a-fA-F0-9]{64}$/.test(hash.trim());
  const base = network === "testnet" ? "https://testnet.bscscan.com/tx/" : "https://bscscan.com/tx/";
  return <div className="max-w-2xl space-y-4">
    <p className="text-sm leading-6 text-white/55">Enter a transaction hash to open its confirmation status and on-chain details in the official BNB Chain explorer.</p>
    <label className="block text-xs text-white/55">Network<select value={network} onChange={event => setNetwork(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#080d17] px-3 py-3 text-sm text-white"><option value="testnet">BNB Testnet</option><option value="mainnet">BNB Smart Chain Mainnet</option></select></label>
    <label className="block text-xs text-white/55">Transaction hash<input value={hash} onChange={event => setHash(event.target.value)} placeholder="0x…" spellCheck="false" className="mt-2 w-full rounded-xl border border-white/10 bg-[#080d17] px-3 py-3 font-mono text-sm text-white outline-none focus:border-apmGreen/50" /></label>
    <a aria-disabled={!validHash} href={validHash ? base + hash.trim() : undefined} target="_blank" rel="noreferrer" className={`inline-flex rounded-xl px-5 py-3 text-sm font-bold ${validHash ? "bg-apmGreen text-[#07120c]" : "cursor-not-allowed bg-white/10 text-white/35"}`}>View transaction ↗</a>
    <p className="text-[11px] text-white/35">Explorer data is provided by BscScan. APM-Agro does not control block confirmation times.</p>
  </div>;
}

export default function APMNavigationDashboard({ account, profile, onProfileUpdated, markets = [], onClose }) {
  const [active, setActive] = useState("profile");
  const [query, setQuery] = useState("");
  const visibleItems = useMemo(() => ITEMS.filter(item => (item.title + " " + item.description).toLowerCase().includes(query.toLowerCase())), [query]);
  const selected = ITEMS.find(item => item.id === active) || ITEMS[0];
  return <main className="mx-auto w-full max-w-7xl px-4 py-6 text-white sm:px-6 sm:py-8">
    <section className="mb-6 overflow-hidden rounded-3xl border border-apmGold/20 bg-gradient-to-br from-[#102319] via-[#10151b] to-[#211b0a] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-apmGold">APM AGRO · MEMBER SPACE</p><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">APM Agro Dashboard</h1><p className="mt-2 text-sm text-white/50">Your profile, agricultural intelligence and account tools in one place.</p></div><button onClick={onClose} className="rounded-xl border border-apmGold/40 px-4 py-2.5 text-sm font-semibold text-apmGold hover:bg-apmGold/10">← Main dashboard</button></div>
    </section>
    <div className="mb-5"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search dashboard features…" className="w-full rounded-xl border border-white/10 bg-[#080d17] px-4 py-3 text-sm text-white outline-none focus:border-apmGreen/50" /></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {visibleItems.map(item => <button key={item.id} onClick={() => setActive(item.id)} aria-pressed={active === item.id} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${active === item.id ? "border-apmGold/55 bg-apmGold/10" : "border-white/10 bg-white/[.025] hover:border-apmGreen/35"}`}><span className="text-2xl">{item.icon}</span><h2 className="mt-3 text-sm font-bold text-white">{item.title}</h2><p className="mt-1 text-xs leading-5 text-white/45">{item.description}</p></button>)}
    </div>
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[.025] p-4 sm:p-6">
      <div className="mb-5 border-b border-white/10 pb-4"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-apmGold">SELECTED FEATURE</p><h2 className="mt-1 text-xl font-bold">{selected.title}</h2></div>
      {active === "profile" && <ProfilePanel profile={profile} account={account} />}
      {active === "regional" && <RegionalCommodityPrices profile={profile} />}
      {active === "global" && <GlobalCommodityPrices />}
      {active === "ai" && <><AIHelper address={account} /><p className="mt-3 text-[11px] text-apmGold/70">AI response service is not connected to the production backend yet; the current assistant component is a UI placeholder.</p></>}
      {active === "watchlist" && <WatchlistPanel account={account || profile?.email} markets={markets} />}
      {active === "explorer" && <ExplorerPanel />}
      {active === "private" && <><WalletSecurityCenter account={account} profile={profile} onProfileUpdated={onProfileUpdated} /><div className="rounded-xl border border-apmGold/15 bg-apmGold/[.04] p-4 text-xs leading-5 text-white/60"><strong className="text-apmGold">Private wallet backup reminder:</strong> APM-Agro never collects or stores seed phrases or private keys. Keep your recovery phrase offline in a secure location you control. Email password reset restores the APM login only; it cannot recover a self-custody wallet or its funds.</div></>}
      {active === "notifications" && <div className="space-y-3"><p className="text-sm leading-6 text-white/55">Notification controls will be enabled after the notification service is connected to the backend.</p>{["Commodity price movements","Prediction market updates","Transaction confirmations","Account security notices"].map(label => <div key={label} className="flex items-center justify-between rounded-xl border border-white/10 p-3"><span className="text-sm text-white/75">{label}</span><span className="rounded-full bg-apmGold/10 px-2.5 py-1 text-[10px] text-apmGold">Coming soon</span></div>)}</div>}
    </section>
  </main>;
}

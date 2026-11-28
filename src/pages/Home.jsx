import React, { useCallback, useEffect, useState } from "react";
import { allMarkets, getUserDashboard } from "../utils/contractHelpers";
import { authApi } from "../utils/authApi";
import MarketCard from "../components/MarketCard";
import CreateMarket from "../components/CreateMarket";
import APMNavigationDashboard from "../components/APMNavigationDashboard";

const compact = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value || 0);

function StatCard({ label, value, hint }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5"><p className="text-xs uppercase tracking-[.16em] text-white/45">{label}</p><p className="mt-2 text-2xl font-extrabold text-white">{value}</p>{hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}</div>;
}

export default function Home({ account, navigationOpen = false, onCloseNavigation }) {
  const [markets, setMarkets] = useState([]);
  const [dashboard, setDashboard] = useState({ positions: [], createdMarkets: [], activity: [], totalStaked: 0, claimableCount: 0 });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [error, setError] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [filter, setFilter] = useState("All");

  const fetchMarkets = useCallback(async () => {
    setLoading(true); setError("");
    try { setMarkets(await allMarkets()); }
    catch (err) {
      console.error("Failed to fetch markets:", err);
      setError(err?.shortMessage || err?.message || "Unable to load markets. Check the public BNB Testnet RPC and Market Factory address.");
    } finally { setLoading(false); }
  }, []);

  const fetchDashboard = useCallback(async () => {
    setDashboardLoading(true); setDashboardError("");
    try {
      const [profileResult, walletResult] = await Promise.allSettled([
        authApi.me(),
        account ? getUserDashboard(account) : Promise.resolve(null)
      ]);
      setProfile(profileResult.status === "fulfilled" ? profileResult.value.user : null);
      if (account && walletResult.status === "fulfilled" && walletResult.value) setDashboard(walletResult.value);
      else setDashboard({ positions: [], createdMarkets: [], activity: [], totalStaked: 0, claimableCount: 0 });
      if (account && walletResult.status === "rejected") throw walletResult.reason;
    } catch (err) {
      console.error("Dashboard data:", err);
      setDashboardError(err?.message || "Could not load on-chain account activity.");
    } finally { setDashboardLoading(false); }
  }, [account]);

  useEffect(() => { fetchMarkets(); }, [fetchMarkets]);
  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const filteredMarkets = filter === "All" ? markets : markets.filter(market => market.status.toLowerCase() === filter.toLowerCase());
  const displayName = profile?.fullName || (account ? "Wallet user" : "APM member");

  if (navigationOpen) return <APMNavigationDashboard account={account} profile={profile} onProfileUpdated={setProfile} markets={markets} onClose={onCloseNavigation} />;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 text-white sm:px-6 sm:py-8">
      <section className="mb-7 overflow-hidden rounded-3xl border border-apmGold/20 bg-gradient-to-br from-[#102319] via-[#10151b] to-[#211b0a] p-5 shadow-[0_18px_50px_rgba(0,0,0,.22)] sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><p className="text-[10px] font-bold uppercase tracking-[.24em] text-apmGold">APM-AGRO MEMBER DASHBOARD</p><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Welcome back, {displayName}</h1><p className="mt-2 text-sm text-white/55">{profile?.email || (account ? account.slice(0, 8) + "…" + account.slice(-6) : "Connect a wallet to view your on-chain positions.")}</p>
            {profile?.country && <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-apmGreen/25 bg-apmGreen/10 px-3 py-1 text-[11px] font-medium text-green-100">📍 {profile.state}, {profile.country}</span>
              {profile.currencyCode && <span className="inline-flex items-center gap-1.5 rounded-full border border-apmGold/25 bg-apmGold/10 px-3 py-1 text-[11px] font-medium text-apmGold">{profile.currencyCode} {profile.currencySymbol || ""} · Regional currency</span>}
            </div>}
          </div>
          <button onClick={() => { fetchDashboard(); fetchMarkets(); }} disabled={loading || dashboardLoading} className="rounded-xl border border-apmGold/45 px-4 py-2.5 text-sm font-semibold text-apmGold transition hover:bg-apmGold/10 disabled:opacity-50">{loading || dashboardLoading ? "Refreshing…" : "Refresh dashboard"}</button>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Available markets" value={markets.length} hint="On BNB Testnet" />
        <StatCard label="My positions" value={dashboard.positions.length} hint="Wallet-linked predictions" />
        <StatCard label="Total staked" value={compact(dashboard.totalStaked) + " APM"} hint="Across your current positions" />
        <StatCard label="Claimable rewards" value={dashboard.claimableCount} hint="Resolved positions not yet claimed" />
      </section>

      {dashboardError && <div role="alert" className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{dashboardError}</div>}

      <section className="mb-8 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-bold">My Predictions</h2><span className="text-xs text-white/40">{dashboard.positions.length} positions</span></div>
          {!account ? <div className="rounded-xl border border-dashed border-apmGreen/30 bg-apmGreen/5 p-5 text-sm text-white/60">Your email account is active. Connect a wallet to see your on-chain predictions and stake APM tokens.</div> : dashboardLoading ? <p className="text-sm text-white/45">Loading your positions…</p> : dashboard.positions.length === 0 ? <p className="text-sm text-white/45">No prediction positions found for this wallet yet.</p> : <div className="space-y-3">{dashboard.positions.map(position => <div key={position.id} className="rounded-xl border border-white/10 p-3"><p className="text-sm font-semibold">{position.question}</p><div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-white/55"><span>YES: {compact(position.yesStake)} APM · NO: {compact(position.noStake)} APM</span><span className="text-apmGold">{position.status}{position.claimable ? " · Claim available" : (position.status === "Resolved" && !position.hasClaimed ? " · No winning claim" : "")}</span></div></div>)}</div>}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-bold">My Created Markets</h2><span className="text-xs text-white/40">{dashboard.createdMarkets.length} markets</span></div>
          {!account ? <p className="text-sm text-white/45">Connect your wallet to view markets created by your address.</p> : dashboard.createdMarkets.length === 0 ? <p className="text-sm text-white/45">You have not created a market with this wallet yet.</p> : <div className="space-y-3">{dashboard.createdMarkets.map(market => <div key={market.id} className="rounded-xl border border-white/10 p-3"><p className="text-sm font-semibold">{market.question}</p><p className="mt-1 text-xs text-white/45">{market.status} · {compact(market.totalLiquidity)} APM liquidity</p></div>)}</div>}
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Recent Transactions</h2><span className="text-xs text-white/40">Latest on-chain activity</span></div>
        {!account ? <p className="text-sm text-white/45">Connect a wallet to view your transaction history.</p> : dashboard.activity.length === 0 ? <p className="text-sm text-white/45">No stake or reward transactions found for this wallet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="text-xs text-white/40"><tr><th className="pb-3 pr-3 font-medium">Activity</th><th className="pb-3 pr-3 font-medium">Market</th><th className="pb-3 pr-3 font-medium">Amount</th><th className="pb-3 font-medium">Transaction</th></tr></thead><tbody>{dashboard.activity.map(item => <tr key={item.id} className="border-t border-white/10"><td className="py-3 pr-3 text-apmGreen">{item.type}</td><td className="max-w-[220px] truncate py-3 pr-3">{item.market}</td><td className="py-3 pr-3">{compact(item.amount)} APM</td><td className="py-3"><a className="text-apmGold hover:underline" href={`https://testnet.bscscan.com/tx/${item.txHash}`} target="_blank" rel="noreferrer">{item.txHash.slice(0, 8)}…</a></td></tr>)}</tbody></table></div>}
      </section>

      <CreateMarket onCreated={fetchMarkets} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-2xl font-bold">Prediction Markets</h2><p className="mt-1 text-sm text-white/45">Explore live markets on BNB Testnet.</p></div><button onClick={fetchMarkets} disabled={loading} className="rounded-lg border border-apmGold/50 px-4 py-2 text-apmGold disabled:opacity-50">{loading ? "Refreshing…" : "Refresh markets"}</button></div>
      <div className="mb-6 flex flex-wrap gap-2">{["All", "Open", "Closed", "Resolved"].map(value => <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-4 py-2 text-sm transition ${filter === value ? "bg-apmGreen font-semibold text-darkBg" : "border border-white/10 bg-darkBg/50 text-white/70 hover:border-apmGreen/40"}`}>{value}</button>)}</div>
      {loading ? <p className="py-10 text-center text-white/60">Loading markets from BNB Testnet…</p> : error ? <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-5 text-red-100"><p>{error}</p><button onClick={fetchMarkets} className="mt-3 underline">Try again</button></div> : filteredMarkets.length === 0 ? <p className="py-10 text-center text-white/60">No markets found.</p> : <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">{filteredMarkets.map(market => <MarketCard key={market.id} market={market} />)}</div>}
    </main>
  );
}

import React, { useState } from "react";
import { BrowserProvider, getAddress } from "ethers";
import { authApi } from "../utils/authApi";
import { getActiveWalletProvider } from "../utils/walletProvider";

export default function WalletAccountRecovery({ account, onConnectWallet, onRecovered }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const recover = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      if (!account) throw new Error("Connect the wallet previously linked to your APM account.");
      const provider = getActiveWalletProvider();
      if (!provider) throw new Error("Wallet provider is unavailable. Reconnect your wallet and try again.");
      const browserProvider = new BrowserProvider(provider);
      const signer = await browserProvider.getSigner();
      const address = getAddress(await signer.getAddress());
      if (address.toLowerCase() !== account.toLowerCase()) throw new Error("The active wallet changed. Reconnect the wallet you originally linked to APM.");
      const challenge = await authApi.walletLoginChallenge(address);
      const signature = await signer.signMessage(challenge.message);
      const result = await authApi.walletLoginVerify({ address, signature, message: challenge.message });
      setNotice(result.message || "APM account recovered.");
      onRecovered?.(result.user);
    } catch (err) {
      setError(err?.shortMessage || err?.message || "Wallet account recovery failed.");
    } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-3">
      <p className="text-sm leading-6 text-white/65">Reconnect the wallet already linked to your APM account, then sign a one-time message to prove ownership. The signature cannot authorize transactions or transfer funds.</p>
      {!account ? (
        <button type="button" onClick={onConnectWallet} className="rounded-xl border border-apmGold/40 px-4 py-3 text-sm font-semibold text-apmGold hover:bg-apmGold/10">Connect your previously linked wallet</button>
      ) : (
        <>
          <p className="break-all rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-xs text-white/55">{account}</p>
          <button type="button" disabled={busy} onClick={recover} className="rounded-xl bg-apmGreen px-4 py-3 text-sm font-bold text-[#07120c] disabled:opacity-50">{busy ? "Verifying wallet ownership…" : "Recover APM account with this wallet"}</button>
        </>
      )}
      <p className="text-[11px] leading-5 text-white/40">This restores your APM profile access only. Access to wallet funds still depends on your wallet provider's own backup or recovery method.</p>
      {notice && <p role="status" className="rounded-lg border border-apmGreen/25 bg-apmGreen/10 p-3 text-xs text-green-100">{notice}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-100">{error}</p>}
    </div>
  );
}

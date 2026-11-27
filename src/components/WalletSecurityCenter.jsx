import React, { useState } from "react";
import { BrowserProvider, getAddress } from "ethers";
import { authApi } from "../utils/authApi";
import { getActiveWalletProvider } from "../utils/walletProvider";

export default function WalletSecurityCenter({ account, profile, onProfileUpdated }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const linkWallet = async () => {
    setBusy(true); setNotice(""); setError("");
    try {
      if (!profile?.email) throw new Error("Sign in with your verified APM email account first. Wallet linking is available to verified account holders.");
      if (!account) throw new Error("Connect the wallet you want to link before continuing.");
      const provider = getActiveWalletProvider();
      if (!provider) throw new Error("Your wallet provider is not ready. Disconnect and reconnect your wallet, then try again.");
      const browserProvider = new BrowserProvider(provider);
      const signer = await browserProvider.getSigner();
      const signerAddress = getAddress(await signer.getAddress());
      if (signerAddress.toLowerCase() !== account.toLowerCase()) throw new Error("The connected wallet changed. Refresh the dashboard and try again.");

      const challenge = await authApi.walletLinkChallenge();
      const signature = await signer.signMessage(challenge.message);
      const result = await authApi.walletLinkVerify({ address: signerAddress, signature, message: challenge.message });
      onProfileUpdated?.(result.user);
      setNotice(result.message || "Wallet ownership verified and linked.");
    } catch (err) {
      setError(err?.shortMessage || err?.message || "Wallet linking could not be completed.");
    } finally { setBusy(false); }
  };

  const unlinkWallet = async () => {
    setBusy(true); setNotice(""); setError("");
    try {
      const result = await authApi.walletUnlink();
      onProfileUpdated?.(result.user);
      setNotice(result.message || "Wallet unlinked.");
    } catch (err) {
      setError(err?.message || "Wallet could not be unlinked.");
    } finally { setBusy(false); }
  };

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-apmGold/20 bg-gradient-to-br from-[#111c19] via-[#10151b] to-[#17170f] p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-apmGold">APM SECURITY CENTER</p>
          <h2 className="mt-1 text-lg font-bold text-white">Wallet & Account Recovery</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-white/55">Link a wallet by signing a one-time ownership message. This signature does not authorize a transaction or transfer funds.</p>
        </div>
        <span className={`w-fit rounded-full border px-3 py-1 text-[10px] font-semibold ${profile?.email ? "border-apmGreen/30 bg-apmGreen/10 text-green-100" : "border-apmGold/30 bg-apmGold/10 text-apmGold"}`}>{profile?.email ? "Verified email account" : "Email sign-in required"}</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/15 p-3.5">
          <p className="text-xs font-semibold text-white/80">Linked wallet</p>
          {profile?.walletAddress ? (
            <>
              <p className="mt-2 break-all font-mono text-xs text-apmGreen">{profile.walletAddress}</p>
              <p className="mt-2 text-[11px] text-white/45">Ownership verified with a wallet signature.</p>
              <button type="button" disabled={busy} onClick={unlinkWallet} className="mt-3 rounded-lg border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-50">Unlink wallet</button>
            </>
          ) : (
            <>
              <p className="mt-2 text-xs text-white/45">No wallet is linked to this email account yet.</p>
              <p className="mt-2 break-all font-mono text-[11px] text-white/55">{account || "Connect a wallet to begin."}</p>
              <button type="button" disabled={busy || !account || !profile?.email} onClick={linkWallet} className="mt-3 rounded-lg bg-apmGreen px-4 py-2.5 text-xs font-bold text-[#07120c] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">{busy ? "Verifying ownership…" : "Verify & link connected wallet"}</button>
            </>
          )}
        </div>
        <div className="rounded-xl border border-apmGold/15 bg-apmGold/[.035] p-3.5">
          <p className="text-xs font-semibold text-apmGold">Protect your recovery phrase</p>
          <ul className="mt-2 space-y-1.5 text-[11px] leading-5 text-white/60">
            <li>• Never enter your seed phrase or private key into APM-Agro.</li>
            <li>• APM staff will never ask you to share wallet secrets.</li>
            <li>• Keep your wallet recovery phrase offline in a secure place you control.</li>
            <li>• Email password recovery restores your APM login, not access to wallet funds.</li>
          </ul>
        </div>
      </div>
      {notice && <p role="status" className="mt-3 rounded-lg border border-apmGreen/25 bg-apmGreen/10 px-3 py-2 text-xs text-green-100">{notice}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-100">{error}</p>}
    </section>
  );
}

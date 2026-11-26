import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "../utils/authApi";

export default function PasswordReset() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError(""); setMessage("");
    if (!token) return setError("This password reset link is missing or invalid.");
    if (password.length < 10) return setError("Use at least 10 characters for your password.");
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      const result = await authApi.resetPassword({ token, password });
      setMessage(result.message || "Password updated. You can now sign in.");
    } catch (err) { setError(err.message || "Unable to reset password."); }
    finally { setBusy(false); }
  }

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-lg items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-apmGold/20 bg-[#0b1020] p-6 shadow-2xl sm:p-8">
        <p className="text-[10px] font-bold tracking-[.24em] text-apmGold">APM-AGRO ACCOUNT SECURITY</p>
        <h1 className="mt-2 text-2xl font-extrabold text-white">Create a new password</h1>
        <p className="mt-2 text-sm leading-6 text-white/55">Choose a strong password with at least 10 characters.</p>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
        {message ? <div role="status" className="mt-5"><p className="rounded-xl border border-apmGreen/30 bg-apmGreen/10 p-3 text-sm text-green-100">{message}</p><Link to="/" className="mt-5 inline-block font-semibold text-apmGold hover:underline">Return to APM-Agro</Link></div> : (
          <form onSubmit={submit} className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-sm text-white/70">New password<input required minLength={10} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="rounded-xl border border-white/10 bg-[#080d17] px-3.5 py-3 text-white focus:border-apmGreen/60 focus:outline-none" /></label>
            <label className="grid gap-1.5 text-sm text-white/70">Confirm new password<input required minLength={10} type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="rounded-xl border border-white/10 bg-[#080d17] px-3.5 py-3 text-white focus:border-apmGreen/60 focus:outline-none" /></label>
            <button disabled={busy || !token} className="rounded-xl bg-apmGreen px-5 py-3 font-bold text-[#07120c] disabled:opacity-50">{busy ? "Updating password…" : "Update password"}</button>
          </form>
        )}
      </section>
    </main>
  );
}

import React, { useEffect, useState } from "react";

const emptyForm = {
  fullName: "", email: "", phoneNumber: "", country: "", state: "",
  postalCode: "", password: "", confirmPassword: ""
};

export default function GetStartedModal({
  open, onClose, onConnectWallet, onRegister, onLogin, onForgotPassword, onResendVerification,
  busy = false, notice = "", initialView = "welcome"
}) {
  const [view, setView] = useState(initialView);
  const [form, setForm] = useState(emptyForm);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setView(initialView);
      setError("");
    }
  }, [open, initialView]);

  if (!open) return null;

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const submitRegister = event => {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    if (form.password.length < 10) return setError("Use at least 10 characters for your password.");
    onRegister?.(form);
  };
  const submitLogin = event => {
    event.preventDefault();
    setError("");
    onLogin?.(login);
  };
  const submitRecovery = event => {
    event.preventDefault();
    setError("");
    onForgotPassword?.({ email: recoveryEmail });
  };
  const field = (label, key, type = "text", required = true) => (
    <label className="grid gap-1.5 text-sm text-white/70" key={key}>
      <span>{label}{!required && <span className="ml-1 text-white/35">(optional)</span>}</span>
      <input
        required={required}
        type={type}
        value={form[key]}
        onChange={event => update(key, event.target.value)}
        autoComplete={key === "password" ? "new-password" : key}
        className="w-full rounded-xl border border-white/10 bg-[#080d17] px-3.5 py-3 text-sm text-white placeholder:text-white/25 transition focus:border-apmGreen/60 focus:outline-none focus:ring-2 focus:ring-apmGreen/15"
      />
    </label>
  );

  const switchView = next => { setError(""); setView(next); };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="apm-auth-title" className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-apmGold/20 bg-[#0b1020] shadow-[0_24px_90px_rgba(0,0,0,.65)]">
        <div className="border-b border-white/10 bg-gradient-to-r from-apmGreen/10 via-transparent to-apmGold/10 px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-[10px] font-bold tracking-[.24em] text-apmGold">AGRO PREDICT MARKET</p>
              <h2 id="apm-auth-title" className="text-xl font-extrabold text-white sm:text-2xl">
                {view === "register" ? "Create your account" : view === "login" ? "Welcome back" : view === "recovery" ? "Recover your account" : "Get started with APM"}
              </h2>
              <p className="mt-1 text-xs text-white/50">Your gateway to decentralized agriculture prediction markets.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:border-apmGold/40 hover:text-apmGold">✕</button>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          {notice && <div role="status" className="mb-4 rounded-xl border border-apmGreen/30 bg-apmGreen/10 px-4 py-3 text-sm text-green-100">{notice}</div>}
          {error && <div role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}

          {view === "welcome" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={onConnectWallet} className="rounded-xl border border-apmGold/35 bg-apmGold/10 p-5 text-left transition hover:-translate-y-0.5 hover:border-apmGold/70">
                <span className="text-2xl">◈</span><span className="mt-3 block font-bold text-apmGold">Connect wallet</span><span className="mt-1 block text-xs leading-5 text-white/55">Continue with your Web3 wallet on BNB Testnet.</span>
              </button>
              <button type="button" onClick={() => switchView("register")} className="rounded-xl border border-apmGreen/35 bg-apmGreen/10 p-5 text-left transition hover:-translate-y-0.5 hover:border-apmGreen/70">
                <span className="text-2xl">✉</span><span className="mt-3 block font-bold text-apmGreen">Register with email</span><span className="mt-1 block text-xs leading-5 text-white/55">Create a verified account using your email address.</span>
              </button>
              <p className="text-center text-xs text-white/45 sm:col-span-2">Already registered? <button type="button" onClick={() => switchView("login")} className="font-semibold text-apmGold hover:underline">Sign in</button></p>
            </div>
          )}

          {view === "register" && (
            <form onSubmit={submitRegister} className="grid max-h-[62vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              <div className="sm:col-span-2">{field("Full name", "fullName")}</div>
              <div className="sm:col-span-2"><label className="grid gap-1.5 text-sm text-white/70">Email address<input required type="email" autoComplete="email" value={form.email} onChange={e => update("email", e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#080d17] px-3.5 py-3 text-sm text-white focus:border-apmGreen/60 focus:outline-none" /></label></div>
              {field("Phone number (include country code)", "phoneNumber", "tel")}
              {field("Country", "country")}
              {field("State / Province", "state")}
              {field("Postal / ZIP code", "postalCode", "text", false)}
              {field("Password (minimum 10 characters)", "password", "password")}
              {field("Confirm password", "confirmPassword", "password")}
              <p className="text-xs leading-5 text-white/45 sm:col-span-2">We will send a confirmation link to your email. You must open that link before signing in.</p>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 sm:col-span-2">
                <button type="button" onClick={() => switchView("login")} className="text-xs text-apmGold hover:underline">Already have an account?</button>
                <button disabled={busy} className="rounded-xl bg-apmGreen px-5 py-3 text-sm font-bold text-[#07120c] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">{busy ? "Creating account…" : "Create account"}</button>
              </div>
            </form>
          )}

          {view === "login" && (
            <form onSubmit={submitLogin} className="grid gap-4">
              <label className="grid gap-1.5 text-sm text-white/70">Email address<input required type="email" autoComplete="email" value={login.email} onChange={e => setLogin(v => ({ ...v, email: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-[#080d17] px-3.5 py-3 text-sm text-white focus:border-apmGreen/60 focus:outline-none" /></label>
              <label className="grid gap-1.5 text-sm text-white/70">Password<input required type="password" autoComplete="current-password" value={login.password} onChange={e => setLogin(v => ({ ...v, password: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-[#080d17] px-3.5 py-3 text-sm text-white focus:border-apmGreen/60 focus:outline-none" /></label>
              <div className="flex items-center justify-between gap-3"><button type="button" onClick={() => switchView("recovery")} className="text-xs text-apmGold hover:underline">Forgot password?</button><button disabled={busy} className="rounded-xl bg-apmGreen px-6 py-3 text-sm font-bold text-[#07120c] disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button></div>
              <p className="text-center text-xs text-white/45">New to APM? <button type="button" onClick={() => switchView("register")} className="text-apmGold hover:underline">Create an account</button></p>
              <div className="grid gap-2 border-t border-white/10 pt-3">
                <label className="text-xs text-white/55">Need a new verification link?<input type="email" placeholder="Your registration email" value={resendEmail} onChange={event=>setResendEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#080d17] px-3 py-2.5 text-sm text-white focus:border-apmGreen/60 focus:outline-none" /></label>
                <button type="button" disabled={busy} onClick={() => {
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendEmail.trim())) {
                    setError("Enter the email address you used to register.");
                    return;
                  }
                  onResendVerification?.({ email: resendEmail.trim() });
                }} className="justify-self-start text-xs font-semibold text-apmGreen hover:underline disabled:opacity-60">Resend confirmation email</button>
              </div>
            </form>
          )}

          {view === "recovery" && (
            <form onSubmit={submitRecovery} className="grid gap-4">
              <p className="text-sm leading-6 text-white/60">Enter the email address linked to your account. If it exists, we will send a secure password-reset link.</p>
              <label className="grid gap-1.5 text-sm text-white/70">Email address<input required type="email" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#080d17] px-3.5 py-3 text-sm text-white focus:border-apmGreen/60 focus:outline-none" /></label>
              <div className="flex items-center justify-between gap-3"><button type="button" onClick={() => switchView("login")} className="text-xs text-white/55 hover:text-apmGold">Back to sign in</button><button disabled={busy} className="rounded-xl bg-apmGold px-5 py-3 text-sm font-bold text-[#171304] disabled:opacity-60">{busy ? "Sending…" : "Send reset link"}</button></div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

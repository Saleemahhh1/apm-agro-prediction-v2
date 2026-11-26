import React, { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import Landing from "./pages/Landing";
import GetStartedModal from "./components/GetStartedModal";
import Home from "./pages/Home";
import MarketDetails from "./pages/MarketDetails";
import { auth } from "./utils/Auth";
import { authApi } from "./utils/authApi";
import { appKit } from "./utils/appKit";
import { setSelectedWalletProvider } from "./utils/walletProvider";

export default function App() {
  const [showModal, setShowModal] = useState(false);
  const [account, setAccount] = useState(() => auth.getUser()?.address || null);
  const [authed, setAuthed] = useState(() => Boolean(auth.getUser()));
  const [isBNBPrimary, setIsBNBPrimary] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [authView, setAuthView] = useState("welcome");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const verification = params.get("emailVerification");
    if (verification === "success") {
      setAuthNotice("Email confirmed successfully. You can now sign in.");
      setAuthView("login");
      setShowModal(true);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (verification) {
      setAuthNotice("That email confirmation link is invalid or has expired. Please register again or contact support.");
      setAuthView("register");
      setShowModal(true);
      window.history.replaceState({}, "", window.location.pathname);
    }

    authApi.me().then(({ user }) => {
      if (!active || !user) return;
      setAuthed(true);
      setAccount(null);
    }).catch(() => {
      // Email session is optional; wallet connection remains an independent sign-in method.
    });
    return () => { active = false; };
  }, []);

  const handleConnectWallet = async () => {
    try {
      if (!appKit) {
        alert("Wallet connection is not configured yet. Add VITE_PROJECT_ID in Vercel Environment Variables and redeploy.");
        return;
      }
      await appKit.open({ view: "Connect" });
    } catch (error) {
      console.error(error);
      alert(error?.message || "Wallet selector could not be opened.");
    }
  };

  const withAuthRequest = async (operation, successMessage, viewAfter = "login") => {
    setAuthBusy(true);
    setAuthNotice("");
    try {
      const result = await operation();
      setAuthNotice(result.message || successMessage);
      if (result.user) {
        setAuthed(true);
        setAccount(null);
        setShowModal(false);
      } else {
        setAuthView(viewAfter);
      }
    } catch (error) {
      setAuthNotice("");
      alert(error.message || "Authentication failed. Please try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRegister = form => withAuthRequest(
    () => authApi.register(form),
    "Registration received. Check your email for the confirmation link.",
    "login"
  );
  const handleLogin = form => withAuthRequest(
    () => authApi.login(form),
    "Signed in successfully."
  );
  const handleForgotPassword = form => withAuthRequest(
    () => authApi.forgotPassword(form),
    "If an account exists for that email, a password reset link will be sent.",
    "recovery"
  );

  const handleLogout = async () => {
    try { await authApi.logout(); } catch (error) { console.warn("Email sign-out:", error); }
    try { if (appKit && account) await appKit.disconnect(); } catch (error) { console.warn("Wallet disconnect:", error); }
    auth.logout();
    setAuthed(false);
    setAccount(null);
    setSelectedWalletProvider(null);
    window.location.assign("/");
  };

  useEffect(() => {
    const interval = setInterval(() => setIsBNBPrimary(previous => !previous), 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!appKit) return undefined;
    const unsubscribeAccount = appKit.subscribeAccount(state => {
      if (state?.isConnected && state?.address) {
        auth.loginWithWallet(state.address);
        setAccount(state.address);
        setAuthed(true);
        setShowModal(false);
      } else {
        const walletUser = auth.getUser();
        if (walletUser?.type === "wallet") auth.logout();
        setAccount(null);
        // Do not sign out an independently authenticated email session on wallet disconnect.
        authApi.me().then(() => setAuthed(true)).catch(() => setAuthed(false));
      }
    });
    const unsubscribeProviders = appKit.subscribeProviders(state => {
      setSelectedWalletProvider(state?.eip155 || null);
    });
    return () => {
      if (typeof unsubscribeAccount === "function") unsubscribeAccount();
      if (typeof unsubscribeProviders === "function") unsubscribeProviders();
    };
  }, []);

  return (
    <div className="min-h-screen bg-darkBg text-white">
      <Header isBNBPrimary={isBNBPrimary} authed={authed} account={account} onConnectWallet={handleConnectWallet} onGetStarted={() => { setAuthNotice(""); setAuthView("welcome"); setShowModal(true); }} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={authed ? <Home account={account} /> : <Landing onGetStarted={() => { setAuthNotice(""); setAuthView("welcome"); setShowModal(true); }} />} />
        <Route path="/market/:id" element={<MarketDetails />} />
        <Route path="*" element={<Landing onGetStarted={() => setShowModal(true)} />} />
      </Routes>
      <GetStartedModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onConnectWallet={handleConnectWallet}
        onRegister={handleRegister}
        onLogin={handleLogin}
        onForgotPassword={handleForgotPassword}
        busy={authBusy}
        notice={authNotice}
        initialView={authView}
      />
    </div>
  );
}

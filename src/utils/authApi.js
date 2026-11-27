const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "The request could not be completed.");
  return data;
}

export const authApi = {
  me: () => request("/api/auth/me"),
  register: payload => request("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: payload => request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  forgotPassword: payload => request("/api/auth/forgot-password", { method: "POST", body: JSON.stringify(payload) }),
  resendVerification: payload => request("/api/auth/resend-verification", { method: "POST", body: JSON.stringify(payload) }),
  resetPassword: payload => request("/api/auth/reset-password", { method: "POST", body: JSON.stringify(payload) }),
  walletLinkChallenge: () => request("/api/auth/wallet-link/challenge", { method: "POST" }),
  walletLinkVerify: payload => request("/api/auth/wallet-link/verify", { method: "POST", body: JSON.stringify(payload) }),
  walletUnlink: () => request("/api/auth/wallet-link", { method: "DELETE" }),
  regionalCommodityPrices: () => request("/api/commodities/regional"),
  logout: () => request("/api/auth/logout", { method: "POST" })
};

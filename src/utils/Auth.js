// Simple client-side Auth utility
export const auth = {
  loginWithWallet(address) {
    const user = { type: 'wallet', address };
    localStorage.setItem('apmUser', JSON.stringify(user));
    return user;
  },

  logout() {
    localStorage.removeItem('apmUser');
  },

  getUser() {
    try {
      const raw = localStorage.getItem('apmUser');
      if (!raw) return null;
      const user = JSON.parse(raw);
      // Only wallet metadata is kept client-side; email identity is always
      // loaded from the server-backed, HTTP-only session cookie.
      if (user?.type !== 'wallet' || typeof user.address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(user.address)) {
        localStorage.removeItem('apmUser');
        return null;
      }
      return user;
    } catch {
      localStorage.removeItem('apmUser');
      return null;
    }
  },
};

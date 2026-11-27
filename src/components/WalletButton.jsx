import React from "react";
import { short } from "../utils/format";

export default function WalletButton({ account, onConnect }) {
  return (
    <button
      type="button"
      onClick={onConnect}
      className="min-h-10 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-darkBg transition hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-apmGold/60 sm:px-4 sm:text-sm"
    >
      {account ? short(account) : "Connect Wallet"}
    </button>
  );
}

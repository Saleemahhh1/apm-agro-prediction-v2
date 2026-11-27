import { createHash } from "node:crypto";
import { getAddress, verifyMessage } from "ethers";

const hashToken = value => createHash("sha256").update(value).digest("hex");

export function verifyWalletOwnership({ address, signature, message, userId, nonceHash, expiresAt, now = Date.now() }) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(String(address || "")) ||
      !/^0x[a-fA-F0-9]{130}$/.test(String(signature || "")) ||
      typeof message !== "string" ||
      !message.startsWith("APM-Agro Wallet Ownership Verification\n")) {
    return { ok: false, message: "Invalid wallet verification request." };
  }

  if (!nonceHash || !expiresAt || new Date(expiresAt).getTime() <= now) {
    return { ok: false, message: "Wallet verification expired. Request a new challenge." };
  }

  const nonceMatch = message.match(/^Nonce: ([a-f0-9]{64})$/m);
  const accountMatch = message.match(/^Account: ([a-f0-9]{24})$/m);
  const issuedMatch = message.match(/^Issued At: (.+)$/m);
  if (!nonceMatch || !accountMatch || !issuedMatch ||
      accountMatch[1] !== String(userId) ||
      hashToken(nonceMatch[1]) !== nonceHash) {
    return { ok: false, message: "Wallet verification challenge is invalid or already used." };
  }

  const issuedAt = Date.parse(issuedMatch[1]);
  if (!Number.isFinite(issuedAt) || issuedAt > now + 60_000 || issuedAt < now - 6 * 60_000) {
    return { ok: false, message: "Wallet verification challenge is too old. Request a new challenge." };
  }

  try {
    const recovered = getAddress(verifyMessage(message, signature));
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return { ok: false, message: "The signature does not match the connected wallet address." };
    }
  } catch {
    return { ok: false, message: "Wallet signature could not be verified." };
  }

  return { ok: true };
}

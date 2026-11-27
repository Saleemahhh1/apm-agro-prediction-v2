import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { Wallet } from "ethers";
import { verifyWalletOwnership } from "../src/utils/walletVerification.js";

const userId = "0123456789abcdef01234567";
const nonce = randomBytes(32).toString("hex");
const nonceHash = createHash("sha256").update(nonce).digest("hex");
const now = Date.now();
const message = [
  "APM-Agro Wallet Ownership Verification",
  "This signature links the wallet to your APM-Agro account.",
  "It does not authorize transactions or token transfers.",
  `Account: ${userId}`,
  `Nonce: ${nonce}`,
  `Issued At: ${new Date(now).toISOString()}`
].join("\n");

test("accepts a valid signed wallet ownership challenge", async () => {
  const wallet = Wallet.createRandom();
  const signature = await wallet.signMessage(message);
  const result = verifyWalletOwnership({
    address: wallet.address, signature, message, userId, nonceHash,
    expiresAt: new Date(now + 5 * 60_000), now
  });
  assert.deepEqual(result, { ok: true });
});

test("rejects a signature from a different wallet", async () => {
  const signer = Wallet.createRandom();
  const other = Wallet.createRandom();
  const signature = await signer.signMessage(message);
  const result = verifyWalletOwnership({
    address: other.address, signature, message, userId, nonceHash,
    expiresAt: new Date(now + 5 * 60_000), now
  });
  assert.equal(result.ok, false);
  assert.match(result.message, /does not match/);
});

test("rejects expired challenges", async () => {
  const wallet = Wallet.createRandom();
  const signature = await wallet.signMessage(message);
  const result = verifyWalletOwnership({
    address: wallet.address, signature, message, userId, nonceHash,
    expiresAt: new Date(now - 1), now
  });
  assert.equal(result.ok, false);
  assert.match(result.message, /expired/);
});

test("rejects a challenge for another account or altered nonce", async () => {
  const wallet = Wallet.createRandom();
  const signature = await wallet.signMessage(message);
  const wrongAccount = verifyWalletOwnership({
    address: wallet.address, signature, message,
    userId: "abcdefabcdefabcdefabcdef", nonceHash,
    expiresAt: new Date(now + 5 * 60_000), now
  });
  assert.equal(wrongAccount.ok, false);
  const wrongNonce = verifyWalletOwnership({
    address: wallet.address, signature, message, userId,
    nonceHash: "0".repeat(64), expiresAt: new Date(now + 5 * 60_000), now
  });
  assert.equal(wrongNonce.ok, false);
});

test("rejects malformed and stale signed challenges", async () => {
  const wallet = Wallet.createRandom();
  const malformed = verifyWalletOwnership({
    address: wallet.address, signature: "0x12", message: "bad", userId,
    nonceHash, expiresAt: new Date(now + 5 * 60_000), now
  });
  assert.equal(malformed.ok, false);
  const staleMessage = message.replace(new Date(now).toISOString(), new Date(now - 10 * 60_000).toISOString());
  const staleSignature = await wallet.signMessage(staleMessage);
  const stale = verifyWalletOwnership({
    address: wallet.address, signature: staleSignature, message: staleMessage, userId,
    nonceHash, expiresAt: new Date(now + 5 * 60_000), now
  });
  assert.equal(stale.ok, false);
  assert.match(stale.message, /too old/);
});

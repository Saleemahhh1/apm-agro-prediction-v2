import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phoneNumber: { type: String, required: true, trim: true, maxlength: 25 },
  country: { type: String, required: true, trim: true, maxlength: 80 },
  state: { type: String, required: true, trim: true, maxlength: 100 },
  postalCode: { type: String, default: "", trim: true, maxlength: 20 },
  currencyCode: { type: String, default: "USD", trim: true, maxlength: 3 },
  currencySymbol: { type: String, default: "$", trim: true, maxlength: 8 },
  // Public wallet address only; never store a seed phrase or private key.
  walletAddress: { type: String, default: undefined, lowercase: true, trim: true, match: /^0x[a-f0-9]{40}$/i, sparse: true, unique: true },
  walletLinkNonceHash: { type: String, select: false },
  walletLinkNonceExpiresAt: { type: Date, select: false },
  walletLoginNonceHash: { type: String, select: false },
  walletLoginNonceExpiresAt: { type: Date, select: false },
  // Optional for backward compatibility with accounts created before mandatory terms acceptance.
  // New registrations are required to submit and store both values in the registration route.
  acceptedTermsAt: { type: Date, default: null },
  acceptedTermsVersion: { type: String, default: null, trim: true, maxlength: 20 },
  passwordHash: { type: String, required: true, select: false },
  emailVerifiedAt: { type: Date, default: null },
  emailVerificationTokenHash: { type: String, select: false },
  emailVerificationExpiresAt: { type: Date, select: false },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  lastLoginAt: { type: Date, default: null },
  sessionVersion: { type: Number, default: 0 },
  // User-owned watchlist labels; never contains wallet secrets or transaction credentials.
  watchlist: { type: [{ type: String, trim: true, maxlength: 120 }], default: [] }
}, { timestamps: true });

export default mongoose.model("User", userSchema);

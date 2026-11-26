import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phoneNumber: { type: String, required: true, trim: true, maxlength: 25 },
  country: { type: String, required: true, trim: true, maxlength: 80 },
  state: { type: String, required: true, trim: true, maxlength: 100 },
  postalCode: { type: String, required: true, trim: true, maxlength: 20 },
  passwordHash: { type: String, required: true, select: false },
  emailVerifiedAt: { type: Date, default: null },
  emailVerificationTokenHash: { type: String, select: false },
  emailVerificationExpiresAt: { type: Date, select: false },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  lastLoginAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model("User", userSchema);

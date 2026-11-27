import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendEmail } from "../services/email.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
const cookieName = () => process.env.COOKIE_NAME || "apm_session";
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000
});
const hashToken = (value) => crypto.createHash("sha256").update(value).digest("hex");
const makeToken = () => crypto.randomBytes(32).toString("hex");
const frontend = () => (process.env.CLIENT_URL || "http://localhost:5173").split(",").map(value => value.trim()).filter(Boolean)[0];
const publicApiBase = () => {
  const value = process.env.API_PUBLIC_URL?.trim();
  if (!value) throw new Error("API_PUBLIC_URL must be configured with the public backend URL");
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error("API_PUBLIC_URL must be a valid absolute URL"); }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("API_PUBLIC_URL must use HTTP or HTTPS");
  return parsed.toString().replace(/\\/+$/, "");
};
const minutes = (key, fallback) => Math.max(5, Number(process.env[key]) || fallback);

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    country: user.country,
    state: user.state,
    postalCode: user.postalCode,
    emailVerified: Boolean(user.emailVerifiedAt)
  };
}

router.post("/register", async (req, res, next) => {
  try {
    const { fullName, email, phoneNumber, country, state, postalCode, password } = req.body || {};
    if (![fullName, email, phoneNumber, country, state, password].every(v => typeof v === "string" && v.trim()) || (postalCode != null && typeof postalCode !== "string")) {
      return res.status(400).json({ message: "Please complete all required fields." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ message: "Enter a valid email address." });
    if (password.length < 10) return res.status(400).json({ message: "Password must contain at least 10 characters." });
    if (!/^\+?[0-9()\s.-]{7,25}$/.test(phoneNumber.trim())) return res.status(400).json({ message: "Enter a valid phone number, including country code." });

    const normalizedEmail = email.trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: "An account with this email already exists. Try signing in or resetting your password." });

    const rawToken = makeToken();
    const user = await User.create({
      fullName: fullName.trim(), email: normalizedEmail, phoneNumber: phoneNumber.trim(),
      country: country.trim(), state: state.trim(), postalCode: String(postalCode || "").trim(),
      passwordHash: await bcrypt.hash(password, 12),
      emailVerificationTokenHash: hashToken(rawToken),
      emailVerificationExpiresAt: new Date(Date.now() + minutes("EMAIL_TOKEN_TTL_MINUTES", 30) * 60_000)
    });

    const link = `${publicApiBase()}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
    try {
      await sendEmail({
        to: user.email,
        subject: "Confirm your APM-Agro email address",
        html: `<p>Hello ${user.fullName.replace(/[&<>"]/g, "")},</p><p>Please confirm your email address to activate your APM-Agro account.</p><p><a href="${link}">Confirm email address</a></p><p>This link expires in ${minutes("EMAIL_TOKEN_TTL_MINUTES", 30)} minutes. If you did not create this account, you can ignore this email.</p>`
      });
    } catch (emailError) {
      await User.deleteOne({ _id: user._id });
      throw emailError;
    }
    return res.status(201).json({ message: "Registration received. Check your email and open the confirmation link to activate your account." });
  } catch (error) { next(error); }
});

router.post("/resend-verification", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const user = await User.findOne({ email });
    const message = "If the account exists and is not yet verified, a new confirmation link will be sent.";
    if (!user || user.emailVerifiedAt) return res.json({ message });
    const rawToken = makeToken();
    user.emailVerificationTokenHash = hashToken(rawToken);
    user.emailVerificationExpiresAt = new Date(Date.now() + minutes("EMAIL_TOKEN_TTL_MINUTES", 30) * 60_000);
    await user.save();
    const link = `${publicApiBase()}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
    await sendEmail({
      to: user.email,
      subject: "Your new APM-Agro confirmation link",
      html: `<p>Please confirm your APM-Agro email address.</p><p><a href="${link}">Confirm email address</a></p><p>This link expires in ${minutes("EMAIL_TOKEN_TTL_MINUTES", 30)} minutes.</p>`
    });
    return res.json({ message });
  } catch (error) { next(error); }
});

router.get("/verify-email", async (req, res, next) => {
  try {
    const token = String(req.query.token || "");
    if (!token) return res.redirect(`${frontend()}/?emailVerification=invalid`);
    const user = await User.findOne({
      emailVerificationTokenHash: hashToken(token),
      emailVerificationExpiresAt: { $gt: new Date() }
    }).select("+emailVerificationTokenHash +emailVerificationExpiresAt");
    if (!user) return res.redirect(`${frontend()}/?emailVerification=expired`);
    user.emailVerifiedAt = new Date();
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();
    return res.redirect(`${frontend()}/?emailVerification=success`);
  } catch (error) { next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: "Invalid email or password." });
    if (!user.emailVerifiedAt) return res.status(403).json({ message: "Please confirm your email address before signing in." });
    const token = jwt.sign({ sv: user.sessionVersion || 0 }, process.env.JWT_SECRET, { subject: user.id, expiresIn: "7d", issuer: "apm-agro" });
    user.lastLoginAt = new Date();
    await user.save();
    res.cookie(cookieName(), token, cookieOptions());
    return res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const user = await User.findOne({ email });
    const responseMessage = "If an account exists for that email, a password reset link will be sent.";
    if (!user || !user.emailVerifiedAt) return res.json({ message: responseMessage });
    const rawToken = makeToken();
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpiresAt = new Date(Date.now() + minutes("PASSWORD_RESET_TTL_MINUTES", 30) * 60_000);
    await user.save();
    const link = `${frontend()}/reset-password?token=${rawToken}`;
    await sendEmail({
      to: user.email,
      subject: "Reset your APM-Agro password",
      html: `<p>We received a request to reset your APM-Agro password.</p><p><a href="${link}">Reset password</a></p><p>This link expires in ${minutes("PASSWORD_RESET_TTL_MINUTES", 30)} minutes. If you did not request this, ignore this email.</p>`
    });
    return res.json({ message: responseMessage });
  } catch (error) { next(error); }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const token = String(req.body?.token || "");
    const password = String(req.body?.password || "");
    if (password.length < 10) return res.status(400).json({ message: "Password must contain at least 10 characters." });
    const user = await User.findOne({
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: { $gt: new Date() }
    }).select("+passwordResetTokenHash +passwordResetExpiresAt");
    if (!user) return res.status(400).json({ message: "This password reset link is invalid or has expired." });
    user.passwordHash = await bcrypt.hash(password, 12);
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();
    res.clearCookie(cookieName(), { ...cookieOptions(), maxAge: undefined });
    return res.json({ message: "Password updated. You can now sign in." });
  } catch (error) { next(error); }
});

router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
router.post("/logout", (req, res) => {
  res.clearCookie(cookieName(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", path: "/" });
  res.json({ message: "Signed out successfully." });
});

export default router;

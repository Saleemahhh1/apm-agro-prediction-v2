import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { connectDatabase } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import marketRoutes from "./routes/market.js";
import commodityRoutes from "./routes/commodities.js";

const app = express();
const port = Number(process.env.PORT) || 5000;
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be configured with at least 32 characters");
}

function validateProductionConfig() {
  if (process.env.NODE_ENV !== "production") return;

  // Resend email delivery is required in production; market-data providers remain optional.
  const required = ["MONGODB_URI", "CLIENT_URL", "API_PUBLIC_URL", "RESEND_API_KEY"];
  const missing = required.filter(key => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }

  const clientOrigins = process.env.CLIENT_URL.split(",").map(value => value.trim()).filter(Boolean);
  if (!clientOrigins.length) throw new Error("CLIENT_URL must contain at least one allowed frontend origin.");
  for (const value of clientOrigins) {
    let parsed;
    try { parsed = new URL(value); } catch { throw new Error("Every CLIENT_URL entry must be a valid absolute URL."); }
    if (parsed.protocol !== "https:" || parsed.origin !== value.replace(/\/+$/, "")) {
      throw new Error("Production CLIENT_URL entries must be HTTPS origins without paths, queries, or fragments.");
    }
  }

  let apiUrl;
  try { apiUrl = new URL(process.env.API_PUBLIC_URL); } catch { throw new Error("API_PUBLIC_URL must be a valid absolute URL."); }
  if (apiUrl.protocol !== "https:" || apiUrl.pathname !== "/" || apiUrl.search || apiUrl.hash) {
    throw new Error("Production API_PUBLIC_URL must be an HTTPS origin without a path, query, or fragment.");
  }
}
validateProductionConfig();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin: (process.env.CLIENT_URL || "http://localhost:5173").split(",").map(v => v.trim()),
  credentials: true
}));
app.use((req, res, next) => {
  const origin = req.get("origin");
  const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173").split(",").map(value => value.trim());
  if (origin && !allowedOrigins.includes(origin)) return res.status(403).json({ message: "Request origin is not allowed." });
  next();
});
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  const status = databaseReady ? 200 : 503;
  return res.status(status).json({
    status: databaseReady ? "ok" : "unavailable",
    service: "apm-agro-api",
    checks: {
      database: databaseReady ? "connected" : "disconnected",
      email: process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "configured" : "not_configured"
    },
    timestamp: new Date().toISOString()
  });
});
app.use("/api/market", rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: "draft-7", legacyHeaders: false }), marketRoutes);
app.use("/api/commodities", rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false }), commodityRoutes);

const authActionLimiter = (windowMs, limit) => rateLimit({
  windowMs,
  limit,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please wait before trying again." }
});
app.use("/api/auth/register", authActionLimiter(60 * 60 * 1000, 5));
app.use("/api/auth/login", authActionLimiter(15 * 60 * 1000, 10));
app.use("/api/auth/resend-verification", authActionLimiter(60 * 60 * 1000, 5));
app.use("/api/auth/forgot-password", authActionLimiter(60 * 60 * 1000, 5));
app.use("/api/auth/reset-password", authActionLimiter(15 * 60 * 1000, 10));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false }), authRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err?.code === 11000) return res.status(409).json({ message: "An account with this email already exists." });
  res.status(500).json({ message: err.message === "Unable to send email at this time" ? err.message : "An unexpected server error occurred." });
});

await connectDatabase();
app.listen(port, () => console.log(`APM-Agro API listening on port ${port}`));

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { connectDatabase } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import marketRoutes from "./routes/market.js";

const app = express();
const port = Number(process.env.PORT) || 5000;
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be configured with at least 32 characters");
}

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

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "apm-agro-api" }));
app.use("/api/market", rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: "draft-7", legacyHeaders: false }), marketRoutes);
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false }), authRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err?.code === 11000) return res.status(409).json({ message: "An account with this email already exists." });
  res.status(500).json({ message: err.message === "Unable to send email at this time" ? err.message : "An unexpected server error occurred." });
});

await connectDatabase();
app.listen(port, () => console.log(`APM-Agro API listening on port ${port}`));

import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

import askRouter from "./routes/ask.js";
import issuesRouter from "./routes/issues.js";
import transitRouter from "./routes/transit.js";
import { scheduleDigest } from "./services/digest.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — slow down." },
});
app.use("/api", limiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/ask", askRouter);
app.use("/api/issues", issuesRouter);
app.use("/api/transit", transitRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Scheduled jobs ────────────────────────────────────────────────────────────
scheduleDigest(); // weekly email to facilities

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`MacAnswers backend running on port ${PORT}`);
});

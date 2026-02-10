import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { marketsRouter } from "./routes/markets";
import { betsRouter } from "./routes/bets";
import { reputationRouter } from "./routes/reputation";
import { protocolRouter } from "./routes/protocol";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST"],
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
app.use(limiter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "clawbets-api", version: "0.1.0" });
});

// Routes
app.use("/api/protocol", protocolRouter);
app.use("/api/markets", marketsRouter);
app.use("/api/bets", betsRouter);
app.use("/api/reputation", reputationRouter);

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🎲 ClawBets API running on port ${PORT}`);
});

export default app;

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import authRoutes from './routes/authRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import profileRoutes from './routes/profileRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import { checkOverdueBookings } from './controllers/bookingController.js';
import { expireUnconfirmed } from './controllers/bookingController.js';
import hostRoutes from './routes/hostRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import cronRoutes from './routes/cronRoutes.js';
import { csrfProtect, setCsrfCookie } from './middleware/csrf.js';
import uploadRoutes from './routes/uploadRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { handleWebhook } from './controllers/paymentController.js';
import { cleanupStaleUploads } from './controllers/uploadController.js';

dotenv.config();

const app = express();
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(cookieParser());
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), handleWebhook);

app.use(express.json({ limit: "10mb" }));
app.use(setCsrfCookie);

const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 3, message: { message: "Too many registration attempts. Try again later." } });
const adminLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: { message: "Too many requests. Slow down." } });

app.use('/api/auth/register', registerLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/cron', cronRoutes);
app.use(csrfProtect);
app.use('/api/profile', profileRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/host', hostRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use(errorHandler);

process.on("uncaughtException", (err) => console.error("UNCAUGHT:", err));
process.on("unhandledRejection", (err) => console.error("UNHANDLED:", err));

// health check
app.get("/", (req, res) => res.send("NP Car Rental API"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  cleanupStaleUploads();
  setInterval(cleanupStaleUploads, 30 * 60 * 1000);
  checkOverdueBookings();
  setInterval(checkOverdueBookings, 5 * 60 * 1000);
  expireUnconfirmed();
  setInterval(expireUnconfirmed, 2 * 60 * 1000);
});

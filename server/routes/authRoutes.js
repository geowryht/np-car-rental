import { Router } from "express";
import { register, registerValidation, login, loginValidation, verifyEmail, resendVerification, refresh, logout } from "../controllers/authController.js";
import { forgotPassword, checkEmail, resetPassword } from "../controllers/passwordResetController.js";
import { protect } from "../middleware/auth.js";
import { loginLimiter } from "../middleware/loginLimiter.js";
import rateLimit from "express-rate-limit";

const checkEmailLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { message: "Too many requests. Slow down." } });

const router = Router();
router.post("/register", registerValidation, register);
router.post("/login", loginValidation, loginLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/check-email", checkEmailLimiter, checkEmail);

export default router;
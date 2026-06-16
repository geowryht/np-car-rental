import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { body, validationResult } from "express-validator";
import { db } from "../config/firebase.js";
import AppError from "../utils/AppError.js";
import { sendVerificationEmail } from "../utils/email.js";
import { markUsed, isUsed } from "./refreshTokenBlacklist.js";
import { resetLoginAttempts, recordFailedAttempt } from "../middleware/loginLimiter.js";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array().map((e) => e.msg).join(". "), 400));
  }
  next();
};

const isProd = () => process.env.VERCEL_ENV === "production";

const cookieBase = () => ({
  httpOnly: true,
  sameSite: isProd() ? "none" : "lax",
  secure: isProd(),
  path: "/",
});

const createAccessToken = (uid) =>
  jwt.sign({ uid }, process.env.JWT_SECRET, { expiresIn: "15m" });

const createRefreshToken = (uid) => {
  const jti = crypto.randomUUID();
  return {
    jti,
    token: jwt.sign({ uid, jti }, process.env.JWT_SECRET, { expiresIn: "7d" }),
  };
};

export const loginValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
  validate,
];

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const snap = await db.collection("users").where("email", "==", email).get();
    if (snap.empty) throw new AppError("username or password is incorrect", 401);

    const doc = snap.docs[0];
    const data = doc.data();
    const match = await bcrypt.compare(password, data.password);
    if (!match) throw new AppError("username or password is incorrect", 401);

    // Email verification required — users must verify before signing in
    if (data.emailVerified === false)
      throw new AppError("Please verify your email before signing in", 403);

    await resetLoginAttempts(email);

    const accessToken = createAccessToken(doc.id);
    const { jti, token: refreshToken } = createRefreshToken(doc.id);

    const csrfToken = crypto.randomBytes(32).toString("hex");

    res.cookie("access_token", accessToken, {
      ...cookieBase(),
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", refreshToken, {
      ...cookieBase(),
      path: "/api/auth/refresh",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("csrf_token", csrfToken, {
      httpOnly: false,
      sameSite: isProd() ? "none" : "lax",
      secure: isProd(),
      path: "/",
    });

    res.json({
      user: {
        id: doc.id,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
      },
    });
  } catch (err) {
    if (err.statusCode === 401) {
      recordFailedAttempt(req.body?.email);
    }
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) throw new AppError("No refresh token", 401);

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new AppError("Invalid refresh token", 401);
    }

    const alreadyUsed = await isUsed(payload.jti);
    if (alreadyUsed) {
      await db.collection("users").doc(payload.uid).update({
        forceLogout: true,
      });
      res.clearCookie("access_token", cookieBase());
      res.clearCookie("refresh_token", { ...cookieBase(), path: "/api/auth/refresh" });
      throw new AppError("Refresh token reused — possible theft. Please log in again.", 401);
    }

    await markUsed(payload.jti, payload.uid);

    const accessToken = createAccessToken(payload.uid);
    const { jti: newJti, token: newRefreshToken } = createRefreshToken(payload.uid);

    const csrfToken = crypto.randomBytes(32).toString("hex");

    res.cookie("access_token", accessToken, {
      ...cookieBase(),
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", newRefreshToken, {
      ...cookieBase(),
      path: "/api/auth/refresh",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("csrf_token", csrfToken, {
      httpOnly: false,
      sameSite: isProd() ? "none" : "lax",
      secure: isProd(),
      path: "/",
    });

    res.json({ message: "Token refreshed" });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
        await markUsed(payload.jti, payload.uid);
      } catch {
      }
    }

    res.clearCookie("access_token", cookieBase());
    res.clearCookie("refresh_token", { ...cookieBase(), path: "/api/auth/refresh" });
    res.clearCookie("csrf_token", {
      httpOnly: false,
      sameSite: isProd() ? "none" : "lax",
      secure: isProd(),
      path: "/",
    });

    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
};

export const registerValidation = [
  body("fullName").trim().notEmpty().withMessage("Full name is required"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  validate,
];

export const register = async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;
    const existing = await db.collection("users").where("email", "==", email).get();
    if (!existing.empty) throw new AppError("Email already in use", 400);

    const hashed = await bcrypt.hash(password, 12);
    const ref = db.collection("users").doc();
    await ref.set({
      email,
      password: hashed,
      fullName,
      role: "renter",
      emailVerified: false,
      createdAt: new Date(),
    });

    const verificationToken = jwt.sign({ uid: ref.id }, process.env.JWT_SECRET, { expiresIn: "24h" });
    await db.collection("users").doc(ref.id).update({ verificationToken });

    await sendVerificationEmail(email, fullName, verificationToken);

    res.status(201).json({ message: "Registration successful. Check your email to verify your account." });
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) throw new AppError("Missing verification token", 400);

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const ref = db.collection("users").doc(payload.uid);
    const doc = await ref.get();

    if (!doc.exists) throw new AppError("User not found", 404);
    if (doc.data().emailVerified) {
      return res.json({ message: "Email already verified. You can sign in." });
    }

    await ref.update({ emailVerified: true, verificationToken: null });
    res.json({ message: "Email verified successfully. You can now sign in." });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new AppError("Verification link expired. Request a new one.", 400));
    }
    if (err.name === "JsonWebTokenError") {
      return next(new AppError("Invalid verification link.", 400));
    }
    next(err);
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new AppError("Email is required", 400);

    const snap = await db.collection("users").where("email", "==", email).get();
    if (snap.empty) throw new AppError("No account found with that email", 404);

    const doc = snap.docs[0];
    const data = doc.data();
    if (data.emailVerified) throw new AppError("Email already verified", 400);

    const verificationToken = jwt.sign({ uid: doc.id }, process.env.JWT_SECRET, { expiresIn: "24h" });
    await db.collection("users").doc(doc.id).update({ verificationToken });
    await sendVerificationEmail(email, data.fullName, verificationToken);

    res.json({ message: "Verification email sent. Check your inbox." });
  } catch (err) {
    next(err);
  }
};

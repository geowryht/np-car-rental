import crypto from "crypto";
import AppError from "../utils/AppError.js";

const isProd = () => process.env.VERCEL_ENV === "production";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function setCsrfCookie(req, res, next) {
  if (req.method === "OPTIONS") return next();
  if (!req.cookies?.csrf_token) {
    const token = crypto.randomBytes(32).toString("hex");
    res.cookie("csrf_token", token, {
      httpOnly: false,
      sameSite: isProd() ? "none" : "lax",
      secure: isProd(),
      path: "/",
    });
  }
  next();
}

export function csrfProtect(req, res, next) {
  if (!MUTATING_METHODS.has(req.method)) return next();
  if (req.path.startsWith("/api/auth/")) return next();

  const header = req.headers["x-csrf-token"];
  const cookie = req.cookies?.csrf_token;

  if (!header || !cookie || header !== cookie) {
    throw new AppError("Invalid CSRF token", 403);
  }

  next();
}

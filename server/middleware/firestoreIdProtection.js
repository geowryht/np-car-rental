import rateLimit from "express-rate-limit";
import AppError from "../utils/AppError.js";

const FIRESTORE_AUTO_ID_RE = /^[A-Za-z0-9]{20}$/;
const NEGATIVE_CACHE_TTL_MS = 10 * 60 * 1000;
const NEGATIVE_CACHE_MAX_SIZE = 1000;
const missingVehicleIds = new Map();

function pruneNegativeCache() {
  const now = Date.now();
  for (const [id, expiresAt] of missingVehicleIds) {
    if (expiresAt <= now) missingVehicleIds.delete(id);
  }

  while (missingVehicleIds.size > NEGATIVE_CACHE_MAX_SIZE) {
    const oldestKey = missingVehicleIds.keys().next().value;
    missingVehicleIds.delete(oldestKey);
  }
}

export const vehicleDetailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many vehicle lookup requests. Try again later." },
});

export function validateVehicleId(req, res, next) {
  if (!FIRESTORE_AUTO_ID_RE.test(req.params.id || "")) {
    return next(new AppError("Vehicle not found", 404));
  }
  next();
}

export function blockKnownMissingVehicleId(req, res, next) {
  const expiresAt = missingVehicleIds.get(req.params.id);
  if (expiresAt && expiresAt > Date.now()) {
    return next(new AppError("Vehicle not found", 404));
  }
  if (expiresAt) missingVehicleIds.delete(req.params.id);
  next();
}

export function rememberMissingVehicleId(id) {
  if (!FIRESTORE_AUTO_ID_RE.test(id || "")) return;
  missingVehicleIds.set(id, Date.now() + NEGATIVE_CACHE_TTL_MS);
  pruneNegativeCache();
}

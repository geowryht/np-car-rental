import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
import AppError from "../utils/AppError.js";

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

function hashEmail(email) {
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

export async function resetLoginAttempts(email) {
  try {
    await db.collection("loginAttempts").doc(hashEmail(email)).delete();
  } catch {
  }
}

export async function loginLimiter(req, res, next) {
  try {
    const email = req.body?.email;
    if (!email) return next();

    const id = hashEmail(email);
    const doc = await db.collection("loginAttempts").doc(id).get();

    if (doc.exists) {
      const data = doc.data();
      const elapsed = Date.now() - data.firstAttempt.toDate();

      if (elapsed > WINDOW_MINUTES * 60 * 1000) {
        await db.collection("loginAttempts").doc(id).set({
          count: 1,
          firstAttempt: new Date(),
          lastAttempt: new Date(),
          ip: req.ip,
        });
        return next();
      }

      if (data.count >= MAX_ATTEMPTS) {
        const retryAfter = Math.ceil((WINDOW_MINUTES * 60 * 1000 - elapsed) / 1000);
        res.set("Retry-After", retryAfter);
        throw new AppError("Too many login attempts. Try again later.", 429);
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

export async function recordFailedAttempt(email) {
  try {
    const id = hashEmail(email);
    const doc = await db.collection("loginAttempts").doc(id).get();

    if (doc.exists) {
      await db.collection("loginAttempts").doc(id).update({
        count: FieldValue.increment(1),
        lastAttempt: new Date(),
      });
    } else {
      await db.collection("loginAttempts").doc(id).set({
        count: 1,
        firstAttempt: new Date(),
        lastAttempt: new Date(),
        ip: null,
      });
    }
  } catch {
  }
}

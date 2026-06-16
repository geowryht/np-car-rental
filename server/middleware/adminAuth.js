import { db } from "../config/firebase.js";
import AppError from "../utils/AppError.js";

export const adminAuth = async (req, res, next) => {
  try {
    const doc = await db.collection("users").doc(req.user.uid).get();
    if (!doc.exists || doc.data().role !== "admin") {
      throw new AppError("Admin access required", 403);
    }
    next();
  } catch (err) {
    next(err);
  }
};

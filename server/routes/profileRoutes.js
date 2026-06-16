import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getProfile, updateProfile, becomeHost, updateProfilePhoto } from "../controllers/profileController.js";
import { protect } from '../middleware/auth.js';
import { cleanupTemporaryUploadsForUser } from "../controllers/uploadController.js";

const router = Router();
const becomeHostLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 2,
  keyGenerator: (req) => req.user.uid,
  handler: async (req, res) => {
    const recordIds = Object.values(req.body?.imageRecordIds || {});
    try {
      await cleanupTemporaryUploadsForUser(req.user.uid, recordIds);
    } catch {
    }
    res.status(429).json({ message: "Too many host application attempts. Try again later." });
  },
});

router.get("/", protect, getProfile);
router.put("/", protect, updateProfile);
router.put("/photo", protect, updateProfilePhoto);
router.post("/become-host", protect, becomeHostLimiter, becomeHost);

export default router;

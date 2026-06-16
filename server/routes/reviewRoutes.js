import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { createReview, getVehicleReviews, getUserReviews, checkReviewExists } from "../controllers/reviewController.js";

const router = Router();

router.post("/", protect, createReview);
router.get("/vehicle/:vehicleId", getVehicleReviews);
router.get("/user/:userId", getUserReviews);
router.get("/check/:bookingId", protect, checkReviewExists);

export default router;

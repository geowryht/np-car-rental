import { Router } from "express";
import { getHostEarnings, getHostVehicleStatus } from "../controllers/bookingController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/earnings", protect, getHostEarnings);
router.get("/vehicle-status", protect, getHostVehicleStatus);

export default router;

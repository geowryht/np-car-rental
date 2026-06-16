import { Router } from "express";
import { cleanupStaleUploads } from "../controllers/uploadController.js";
import { checkOverdueBookings } from "../controllers/bookingController.js";
import { expireUnconfirmed } from "../controllers/bookingController.js";

const router = Router();

router.post("/cleanup-stale-uploads", async (req, res) => {
    await cleanupStaleUploads();
    res.json({ message: "Cleanup complete" });
});

router.post("/check-overdue-bookings", async (req, res) => {
    await checkOverdueBookings();
    res.json({ message: "Overdue check complete" });
});

router.post("/expire-unconfirmed", async (req, res) => {
    await expireUnconfirmed();
    res.json({ message: "Expiry check complete" });
});

export default router;

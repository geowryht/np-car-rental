import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { adminAuth } from "../middleware/adminAuth.js";
import * as admin from "../controllers/adminController.js";

const router = Router();

router.use(protect, adminAuth);

router.get("/stats", admin.getStats);
router.get("/users", admin.getUsers);
router.put("/users/:id/role", admin.updateUserRole);
router.get("/host-applications", admin.getHostApplications);
router.put("/host-applications/:id/approve", admin.approveHost);
router.put("/host-applications/:id/reject", admin.rejectHost);
router.get("/vehicles", admin.getAllVehicles);
router.delete("/vehicles/:id", admin.deleteVehicle);
router.get("/bookings", admin.getAllBookings);
router.get("/settings", admin.getSettings);
router.put("/settings", admin.updateSettings);

export default router;

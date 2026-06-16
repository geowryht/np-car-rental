import { Router } from "express";
import { createVehicle, deleteVehicle, getAllVehicles, getMyVehicles, getVehicleById, updateVehicle } from "../controllers/vehicleController.js";
import { protect } from "../middleware/auth.js";
import { blockKnownMissingVehicleId, validateVehicleId, vehicleDetailLimiter } from "../middleware/firestoreIdProtection.js";

const router = Router();

router.get("/", getAllVehicles);
router.post("/", protect, createVehicle);
router.get("/mine", protect, getMyVehicles);
router.put("/:id", protect, updateVehicle);
router.delete("/:id", protect, deleteVehicle);
router.get("/:id", vehicleDetailLimiter, validateVehicleId, blockKnownMissingVehicleId, getVehicleById);

export default router;

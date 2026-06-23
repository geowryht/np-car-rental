import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
    createCheckout,
    getPaymentStatus,
    verifyPayment,
    refundBooking,
    getMyPendingVehicleIds,
    checkUserPendingBooking,
} from "../controllers/paymentController.js";

const router = Router();

router.post("/create-checkout", protect, createCheckout);
router.get("/status/:bookingId", protect, getPaymentStatus);
router.post("/verify/:bookingId", protect, verifyPayment);
router.post("/refund/:bookingId", protect, refundBooking);
router.get("/my-pending-vehicle-ids", protect, getMyPendingVehicleIds);
router.get("/check/:vehicleId", protect, checkUserPendingBooking);

export default router;

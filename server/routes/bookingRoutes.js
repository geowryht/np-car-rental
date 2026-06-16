import { Router } from "express";
import {
  createBooking,
  getMyBookings,
  getReceivedBookings,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  returnBooking,
} from "../controllers/bookingController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/", protect, createBooking);
router.get("/mine", protect, getMyBookings);
router.get("/received", protect, getReceivedBookings);
router.put("/:id/accept", protect, acceptBooking);
router.put("/:id/reject", protect, rejectBooking);
router.put("/:id/cancel", protect, cancelBooking);
router.put("/:id/return", protect, returnBooking);

export default router;

import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { recordUpload } from "../controllers/uploadController.js";

const router = Router();
router.post("/record", protect, recordUpload);

export default router;

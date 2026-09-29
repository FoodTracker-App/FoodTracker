import { Router } from "express";
import * as stockMovementController from "../controllers/stockMovementController.js";

const router = Router();

router.post("/:id/adjustments", stockMovementController.createAdjustment);
router.get("/:id/movements", stockMovementController.listMovements);

export default router;

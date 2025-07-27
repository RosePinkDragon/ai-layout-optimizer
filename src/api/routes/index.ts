import { Router } from "express";
import { LayoutController } from "../controllers/layout.controller";

const router = Router();

// Health check endpoint
router.get("/health", LayoutController.healthCheck);

// Get all available buildings
router.get("/buildings", LayoutController.getAvailableBuildings);

// Optimize layout endpoint
router.post("/optimize-layout", LayoutController.optimizeLayout);

export default router;

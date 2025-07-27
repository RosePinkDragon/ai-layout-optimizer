import type { Request, Response } from "express";
import { BuildingService } from "../services/building.service";
import { AILayoutOptimizer } from "../../layout_generator";
import type {
  PlotConfiguration,
  RoadPlacement,
} from "../../layout_generator/types";

export interface OptimizeLayoutRequest {
  buildingNames: string[];
  plotConfiguration: PlotConfiguration;
  roadPlacements?: RoadPlacement;
}

export class LayoutController {
  /**
   * POST /api/optimize-layout
   * Optimizes building layout using AI Layout Optimizer
   */
  static async optimizeLayout(req: Request, res: Response) {
    try {
      const {
        buildingNames,
        plotConfiguration,
        roadPlacements,
      }: OptimizeLayoutRequest = req.body;

      // Validate request body
      if (
        !buildingNames ||
        !Array.isArray(buildingNames) ||
        buildingNames.length === 0
      ) {
        return res.status(400).json({
          error: "buildingNames is required and must be a non-empty array",
        });
      }

      if (!plotConfiguration) {
        return res.status(400).json({
          error: "plotConfiguration is required",
        });
      }

      // Validate plot configuration
      const plotValidation =
        AILayoutOptimizer.validatePlotConfiguration(plotConfiguration);
      if (!plotValidation.isValid) {
        return res.status(400).json({
          error: "Invalid plot configuration",
          details: plotValidation.errors,
        });
      }

      // Fetch buildings from database
      console.log(
        `Fetching ${buildingNames.length} buildings from database...`
      );
      const buildings = await BuildingService.getBuildingsByNames(
        buildingNames
      );

      // Check if all requested buildings were found
      const foundBuildingNames = buildings.map((b) => b.name);
      const missingBuildings = buildingNames.filter(
        (name) => !foundBuildingNames.includes(name)
      );

      if (missingBuildings.length > 0) {
        console.warn(
          `Buildings not found in database: ${missingBuildings.join(", ")}`
        );
      }

      if (buildings.length === 0) {
        return res.status(404).json({
          error: "No buildings found in database",
          missingBuildings,
        });
      }

      console.log(`Found ${buildings.length} buildings, generating layout...`);

      // Generate optimized layout
      const result = AILayoutOptimizer.optimizeLayout(
        plotConfiguration,
        buildings,
        roadPlacements
      );

      // Return the result with additional metadata
      res.json({
        ...result,
        metadata: {
          requestedBuildings: buildingNames.length,
          foundBuildings: buildings.length,
          missingBuildings:
            missingBuildings.length > 0 ? missingBuildings : undefined,
          plotConfiguration,
          roadPlacements: roadPlacements || null,
        },
      });
    } catch (error) {
      console.error("Error in optimizeLayout:", error);

      if (error instanceof Error) {
        res.status(500).json({
          error: "Internal server error",
          message: error.message,
        });
      } else {
        res.status(500).json({
          error: "Internal server error",
          message: "An unknown error occurred",
        });
      }
    }
  }

  /**
   * GET /api/buildings
   * Get all available building names
   */
  static async getAvailableBuildings(req: Request, res: Response) {
    try {
      const buildingNames = await BuildingService.getAllBuildingNames();
      const sortedBuildings = buildingNames.toSorted((a, b) =>
        a.localeCompare(b)
      );

      res.json({
        success: true,
        count: buildingNames.length,
        buildings: sortedBuildings,
      });
    } catch (error) {
      console.error("Error in getAvailableBuildings:", error);

      res.status(500).json({
        error: "Failed to fetch available buildings",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * GET /api/health
   * Health check endpoint
   */
  static async healthCheck(req: Request, res: Response) {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "AI Layout Optimizer API",
    });
  }
}

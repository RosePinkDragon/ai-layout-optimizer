import type { Request, Response } from "express";
import { BuildingService } from "../services/building.service";
import { AILayoutOptimizer } from "../../layout_generator";
import type {
  PlotConfiguration,
  RoadPlacement,
  Building,
  LayoutOptimizationResult,
} from "../../layout_generator/types";

export interface OptimizeLayoutRequest {
  buildingNames: string[];
  plotConfiguration: PlotConfiguration;
  roadPlacements?: RoadPlacement;
}

export interface AIOptimizeLayoutRequest {
  plotConfiguration: PlotConfiguration;
  buildings: Array<{
    name: string;
    count: number;
  }>;
}

export class LayoutController {
  /**
   * POST /api/ai-optimize-layout
   * AI-powered layout optimization that automatically generates road placements
   * and optimizes building placement for maximum revenue
   */
  static async aiOptimizeLayout(req: Request, res: Response) {
    try {
      const { plotConfiguration, buildings }: AIOptimizeLayoutRequest =
        req.body;

      // Validate request
      const validationResult = LayoutController.validateAIOptimizeRequest(
        plotConfiguration,
        buildings
      );
      if (validationResult.error) {
        return res.status(validationResult.status).json(validationResult.error);
      }

      // Process buildings and fetch from database
      const buildingResult = await LayoutController.processBuildingsForAI(buildings);
      if (buildingResult.error) {
        return res.status(buildingResult.status).json(buildingResult.error);
      }

      console.log(
        `AI optimization: ${buildingResult.expandedBuildings.length} buildings, ${buildingResult.dbBuildings.length} unique types...`
      );

      // Generate optimal layout
      const optimizationAttempts = await LayoutController.generateMultipleLayouts(
        plotConfiguration,
        buildingResult.expandedBuildings
      );

      const bestLayout = LayoutController.findBestLayout(
        optimizationAttempts,
        buildingResult.expandedBuildings
      );

      // Return result
      res.json({
        ...bestLayout,
        metadata: {
          requestedBuildings: buildings,
          totalBuildingInstances: buildingResult.expandedBuildings.length,
          foundBuildingTypes: buildingResult.dbBuildings.length,
          missingBuildings: buildingResult.missingBuildings.length > 0 
            ? buildingResult.missingBuildings 
            : undefined,
          plotConfiguration,
          optimizationAttempts: optimizationAttempts.length,
          isAIOptimized: true,
        },
      });
    } catch (error) {
      console.error("Error in aiOptimizeLayout:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({
        error: "Internal server error",
        message,
      });
    }
  }

  /**
   * Validates the AI optimize request
   */
  private static validateAIOptimizeRequest(
    plotConfiguration: PlotConfiguration,
    buildings: Array<{ name: string; count: number }>
  ) {
    if (!buildings || !Array.isArray(buildings) || buildings.length === 0) {
      return {
        status: 400,
        error: { error: "buildings is required and must be a non-empty array" },
      };
    }

    if (!plotConfiguration) {
      return {
        status: 400,
        error: { error: "plotConfiguration is required" },
      };
    }

    for (const building of buildings) {
      if (!building.name || typeof building.name !== "string") {
        return {
          status: 400,
          error: { error: "Each building must have a valid name" },
        };
      }
      if (
        !building.count ||
        typeof building.count !== "number" ||
        building.count < 1
      ) {
        return {
          status: 400,
          error: { error: "Each building must have a count of at least 1" },
        };
      }
    }

    const plotValidation = AILayoutOptimizer.validatePlotConfiguration(plotConfiguration);
    if (!plotValidation.isValid) {
      return {
        status: 400,
        error: {
          error: "Invalid plot configuration",
          details: plotValidation.errors,
        },
      };
    }

    return { error: null };
  }

  /**
   * Processes buildings for AI optimization
   */
  private static async processBuildingsForAI(
    buildings: Array<{ name: string; count: number }>
  ) {
    const uniqueBuildingNames = [...new Set(buildings.map((b) => b.name))];
    const dbBuildings = await BuildingService.getBuildingsByNames(uniqueBuildingNames);

    const foundBuildingNames = dbBuildings.map((b) => b.name);
    const missingBuildings = uniqueBuildingNames.filter(
      (name) => !foundBuildingNames.includes(name)
    );

    if (missingBuildings.length > 0) {
      console.warn(`Buildings not found in database: ${missingBuildings.join(", ")}`);
    }

    if (dbBuildings.length === 0) {
      return {
        status: 404,
        error: {
          error: "No buildings found in database",
          missingBuildings,
        },
      };
    }

    const expandedBuildings = LayoutController.expandBuildingInstances(buildings, dbBuildings);

    return {
      error: null,
      expandedBuildings,
      dbBuildings,
      missingBuildings,
    };
  }

  /**
   * Creates expanded building instances based on counts
   */
  private static expandBuildingInstances(
    buildings: Array<{ name: string; count: number }>,
    dbBuildings: Building[]
  ): Building[] {
    const expandedBuildings: Building[] = [];
    
    for (const buildingReq of buildings) {
      const template = dbBuildings.find((b) => b.name === buildingReq.name);
      if (template) {
        for (let i = 0; i < buildingReq.count; i++) {
          expandedBuildings.push({
            ...template,
            id: `${buildingReq.name}_${i + 1}`,
          });
        }
      }
    }

    return expandedBuildings;
  }

  /**
   * Finds the best layout from optimization attempts
   */
  private static findBestLayout(
    optimizationAttempts: LayoutOptimizationResult[],
    expandedBuildings: Building[]
  ): LayoutOptimizationResult {
    return optimizationAttempts.reduce(
      (best: LayoutOptimizationResult, current: LayoutOptimizationResult) =>
        current.success &&
        current.totalCoinsRevenue + current.totalPassengersRevenue >
          best.totalCoinsRevenue + best.totalPassengersRevenue
          ? current
          : best,
      optimizationAttempts[0] || {
        success: false,
        placedBuildings: [],
        failedBuildings: expandedBuildings,
        totalCoinsRevenue: 0,
        totalPassengersRevenue: 0,
        coinsRevenuePerHour: 0,
        passengersRevenuePerHour: 0,
        bonusAnalysis: [],
        gridVisualization: "",
        validation: { isValid: false, errors: ["No optimization attempts completed"] },
      }
    );
  }
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

  /**
   * Generates multiple layout configurations with different road placements
   * and returns the optimization results for each
   */
  private static async generateMultipleLayouts(
    plotConfiguration: PlotConfiguration,
    buildings: Building[]
  ): Promise<LayoutOptimizationResult[]> {
    const results: LayoutOptimizationResult[] = [];

    // Strategy 1: No roads (rely on infinite road at Y=0)
    results.push(
      AILayoutOptimizer.optimizeLayout(plotConfiguration, buildings)
    );

    // Strategy 2: Central cross road network
    const centralCrossRoads = LayoutController.generateCentralCrossRoads(plotConfiguration);
    results.push(
      AILayoutOptimizer.optimizeLayout(
        plotConfiguration,
        buildings,
        centralCrossRoads
      )
    );

    // Strategy 3: Grid road network
    const gridRoads = LayoutController.generateGridRoadNetwork(plotConfiguration);
    results.push(
      AILayoutOptimizer.optimizeLayout(
        plotConfiguration,
        buildings,
        gridRoads
      )
    );

    // Strategy 4: Border roads around plots
    const borderRoads = LayoutController.generateBorderRoads(plotConfiguration);
    results.push(
      AILayoutOptimizer.optimizeLayout(
        plotConfiguration,
        buildings,
        borderRoads
      )
    );

    // Strategy 5: Minimal road network (sparse placement)
    const minimalRoads = LayoutController.generateMinimalRoadNetwork(plotConfiguration);
    results.push(
      AILayoutOptimizer.optimizeLayout(
        plotConfiguration,
        buildings,
        minimalRoads
      )
    );

    return results;
  }

  /**
   * Generates a central cross road pattern
   */
  private static generateCentralCrossRoads(
    plotConfig: PlotConfiguration
  ): RoadPlacement {
    const positions = [];
    const totalWidth = plotConfig.plotsX * plotConfig.plotSize.width;
    const totalHeight = plotConfig.plotsY * plotConfig.plotSize.height;
    const centerX = Math.floor(totalWidth / 2);
    const centerY = Math.floor(totalHeight / 2);

    // Vertical line
    for (let y = 1; y < totalHeight; y++) {
      positions.push({ x: centerX, y });
    }

    // Horizontal line
    for (let x = 0; x < totalWidth; x++) {
      if (x !== centerX) {
        positions.push({ x, y: centerY });
      }
    }

    return { positions };
  }

  /**
   * Generates a grid road network
   */
  private static generateGridRoadNetwork(
    plotConfig: PlotConfiguration
  ): RoadPlacement {
    const positions = [];
    const totalWidth = plotConfig.plotsX * plotConfig.plotSize.width;
    const totalHeight = plotConfig.plotsY * plotConfig.plotSize.height;

    // Vertical roads every plot width
    for (let x = plotConfig.plotSize.width - 1; x < totalWidth; x += plotConfig.plotSize.width) {
      for (let y = 1; y < totalHeight; y++) {
        positions.push({ x, y });
      }
    }

    // Horizontal roads every plot height
    for (let y = plotConfig.plotSize.height - 1; y < totalHeight; y += plotConfig.plotSize.height) {
      for (let x = 0; x < totalWidth; x++) {
        positions.push({ x, y });
      }
    }

    return { positions };
  }

  /**
   * Generates border roads around plots
   */
  private static generateBorderRoads(
    plotConfig: PlotConfiguration
  ): RoadPlacement {
    const positions = [];
    const totalWidth = plotConfig.plotsX * plotConfig.plotSize.width;
    const totalHeight = plotConfig.plotsY * plotConfig.plotSize.height;

    // Create borders around each plot
    for (let plotY = 0; plotY < plotConfig.plotsY; plotY++) {
      for (let plotX = 0; plotX < plotConfig.plotsX; plotX++) {
        const plotBorders = LayoutController.generateSinglePlotBorder(
          plotX,
          plotY,
          plotConfig,
          totalWidth,
          totalHeight
        );
        positions.push(...plotBorders);
      }
    }

    return { positions };
  }

  /**
   * Generates border roads for a single plot
   */
  private static generateSinglePlotBorder(
    plotX: number,
    plotY: number,
    plotConfig: PlotConfiguration,
    totalWidth: number,
    totalHeight: number
  ): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];
    const startX = plotX * plotConfig.plotSize.width;
    const startY = plotY * plotConfig.plotSize.height;
    const endX = startX + plotConfig.plotSize.width - 1;
    const endY = startY + plotConfig.plotSize.height - 1;

    // Top border (skip if at Y=0 due to infinite road)
    if (startY > 0) {
      LayoutController.addHorizontalRoad(positions, startX, endX, startY);
    }

    // Bottom border
    if (endY < totalHeight - 1) {
      LayoutController.addHorizontalRoad(positions, startX, endX, endY);
    }

    // Left border
    LayoutController.addVerticalRoad(positions, startX, startY + 1, endY - 1);

    // Right border
    if (endX < totalWidth - 1) {
      LayoutController.addVerticalRoad(positions, endX, startY + 1, endY - 1);
    }

    return positions;
  }

  /**
   * Adds horizontal road positions
   */
  private static addHorizontalRoad(
    positions: Array<{ x: number; y: number }>,
    startX: number,
    endX: number,
    y: number
  ) {
    for (let x = startX; x <= endX; x++) {
      positions.push({ x, y });
    }
  }

  /**
   * Adds vertical road positions
   */
  private static addVerticalRoad(
    positions: Array<{ x: number; y: number }>,
    x: number,
    startY: number,
    endY: number
  ) {
    for (let y = startY; y <= endY; y++) {
      positions.push({ x, y });
    }
  }

  /**
   * Generates minimal road network (sparse placement)
   */
  private static generateMinimalRoadNetwork(
    plotConfig: PlotConfiguration
  ): RoadPlacement {
    const positions = [];
    const totalWidth = plotConfig.plotsX * plotConfig.plotSize.width;
    const totalHeight = plotConfig.plotsY * plotConfig.plotSize.height;

    // Place roads at strategic points to ensure connectivity
    // Central vertical line (every other position)
    const centerX = Math.floor(totalWidth / 2);
    for (let y = 1; y < totalHeight; y += 2) {
      positions.push({ x: centerX, y });
    }

    // Horizontal connections (every other plot)
    for (let plotY = 0; plotY < plotConfig.plotsY; plotY += 2) {
      const y = plotY * plotConfig.plotSize.height + Math.floor(plotConfig.plotSize.height / 2);
      if (y > 0 && y < totalHeight) {
        for (let x = 0; x < totalWidth; x += 2) {
          if (x !== centerX) {
            positions.push({ x, y });
          }
        }
      }
    }

    return { positions };
  }
}

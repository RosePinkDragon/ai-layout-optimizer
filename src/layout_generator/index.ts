import { LayoutGenerator } from "./layout_generator";
import { BuildingUtils } from "./building_utils";
import type {
  Building,
  PlotConfiguration,
  LayoutOptimizationResult,
  RoadPlacement,
} from "./types";

/**
 * AI Layout Optimizer - Standalone Application
 *
 * This class provides a clean API for optimizing building layouts in Airport City.
 * It takes plot configuration, road placements, and building lists to generate
 * optimized layouts with bonus calculations.
 */
export class AILayoutOptimizer {
  /**
   * Optimizes building layout for the given configuration
   *
   * @param plotConfig - Configuration for the plot grid
   * @param buildings - List of buildings to place
   * @param roadPlacements - Optional custom road placements (if not provided, basic road network will be generated)
   * @returns Optimization result with placed buildings, revenue analysis, and grid visualization
   */
  static optimizeLayout(
    plotConfig: PlotConfiguration,
    buildings: Building[],
    roadPlacements?: RoadPlacement
  ): LayoutOptimizationResult {
    try {
      // Initialize the layout generator
      const generator = new LayoutGenerator(plotConfig);

      // Set up road network
      if (roadPlacements && roadPlacements.positions.length > 0) {
        // Place custom roads
        for (const position of roadPlacements.positions) {
          generator.placeRoad(position);
        }
      }
      // else {
      //   // Generate basic road network if no custom roads provided
      //   BuildingUtils.generateBasicRoadNetwork(generator);
      // }

      // Optimize building placement
      const placementResult = BuildingUtils.optimizePlacement(
        buildings,
        generator
      );

      // Calculate bonus analysis for all placed buildings
      const bonusAnalysis = placementResult.placed.map((building) => ({
        building,
        revenueResult: generator.calculateRevenueOutput(building),
        affectedBuildings:
          building.type === "decoration" && building.bonus
            ? generator.getBuildingsAffectedByBonus(building)
            : [],
      }));

      // Calculate total revenue
      const revenueStats = BuildingUtils.calculateTotalRevenue(generator);

      // Validate the final layout
      const validation = generator.validateGrid();

      return {
        success: true,
        placedBuildings: placementResult.placed,
        failedBuildings: placementResult.failed,
        totalCoinsRevenue: revenueStats.totalCoinsRevenue,
        totalPassengersRevenue: revenueStats.totalPassengersRevenue,
        coinsRevenuePerHour: revenueStats.coinsRevenuePerHour,
        passengersRevenuePerHour: revenueStats.passengersRevenuePerHour,
        bonusAnalysis,
        gridVisualization: generator.visualizeGrid(),
        validation,
      };
    } catch (error) {
      return {
        success: false,
        placedBuildings: [],
        failedBuildings: buildings,
        totalCoinsRevenue: 0,
        totalPassengersRevenue: 0,
        coinsRevenuePerHour: 0,
        passengersRevenuePerHour: 0,
        bonusAnalysis: [],
        gridVisualization: "",
        validation: {
          isValid: false,
          errors: [
            error instanceof Error ? error.message : "Unknown error occurred",
          ],
        },
      };
    }
  }

  /**
   * Get available building templates for Airport City
   *
   * @returns Map of building templates by name
   */
  static getBuildingTemplates(): Map<string, Building> {
    return BuildingUtils.createBuildingTemplates();
  }

  /**
   * Create a building from template with a specific ID
   *
   * @param templateName - Name of the building template
   * @param buildingId - Unique ID for the building instance
   * @returns Building instance or null if template not found
   */
  static createBuilding(
    templateName: string,
    buildingId: string
  ): Building | null {
    const templates = BuildingUtils.createBuildingTemplates();
    const template = templates.get(templateName);

    if (!template) {
      return null;
    }

    return BuildingUtils.createBuildingFromTemplate(template, buildingId);
  }

  /**
   * Validate a plot configuration
   *
   * @param plotConfig - Plot configuration to validate
   * @returns Validation result with any errors
   */
  static validatePlotConfiguration(plotConfig: PlotConfiguration): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (plotConfig.plotsX <= 0) {
      errors.push("plotsX must be greater than 0");
    }

    if (plotConfig.plotsY <= 0) {
      errors.push("plotsY must be greater than 0");
    }

    if (plotConfig.plotSize.width <= 0) {
      errors.push("plotSize width must be greater than 0");
    }

    if (plotConfig.plotSize.height <= 0) {
      errors.push("plotSize height must be greater than 0");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Export the main function for backwards compatibility and ease of use
export function optimizeLayout(
  plotConfig: PlotConfiguration,
  buildings: Building[],
  roadPlacements?: RoadPlacement
): LayoutOptimizationResult {
  return AILayoutOptimizer.optimizeLayout(
    plotConfig,
    buildings,
    roadPlacements
  );
}

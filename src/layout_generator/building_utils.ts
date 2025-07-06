import type { Building, Position, Plot } from "./types";
import { LayoutGenerator } from "./layout_generator";
import { buildings_list } from "../../data/buildings";

/**
 * Utility functions for building management and optimization
 */
export class BuildingUtils {
  /**
   * Creates predefined building templates for Airport City
   */
  static createBuildingTemplates(): Map<string, Building> {
    const buildings = new Map<string, Building>();

    Object.keys(buildings_list).forEach((key) => {
      const template = buildings_list[key];
      if (template) {
        buildings.set(key, template);
      }
    });

    return buildings;
  }

  /**
   * Creates a unique building instance from a template
   */
  static createBuildingFromTemplate(
    template: Building,
    instanceId: string
  ): Building {
    return {
      ...template,
      id: instanceId,
    };
  }

  /**
   * Calculates the revenue per hour for a building
   * considers bonuses if a generator is provided
   *
   * @param building The building to calculate revenue for
   * @param generator Optional LayoutGenerator to apply bonuses
   * @returns Revenue per hour, or 0 for decorations or buildings without revenue
   */
  static calculateRevenuePerHour(
    building: Building,
    generator?: LayoutGenerator
  ): number {
    if (building.type === "decoration" && building.requiresRoad === false) {
      return 0; // Decorations do not generate revenue directly
    }

    if (!building.timeToRevenue || building.timeToRevenue === 0) {
      return 0; // Decorative buildings with instant revenue
    }

    let baseRevenue = building.revenue;

    // Apply bonuses if generator is provided and building is placed
    if (generator && building.position) {
      const revenueResult = generator.calculateRevenueOutput(building);
      // Use the appropriate revenue type based on building type
      if (building.type === "residential") {
        baseRevenue = revenueResult.passengers.finalOutput;
      } else if (
        building.type === "commercial" ||
        building.type === "decoration"
      ) {
        baseRevenue = revenueResult.coins.finalOutput;
      }
    }

    return (baseRevenue / building.timeToRevenue) * 3600;
  }

  /**
   * Finds all valid positions for a building in a specific plot
   */
  static findValidPositionsInPlot(
    building: Building,
    plot: Plot,
    generator: LayoutGenerator
  ): Position[] {
    const validPositions: Position[] = [];

    // Try every position within the plot
    for (
      let y = plot.position.y;
      y <= plot.position.y + plot.size.height - building.size.height;
      y++
    ) {
      for (
        let x = plot.position.x;
        x <= plot.position.x + plot.size.width - building.size.width;
        x++
      ) {
        const testBuilding = { ...building, id: `test_${Date.now()}` };
        const placement = generator.placeBuilding(testBuilding, { x, y });

        if (placement.isValid) {
          validPositions.push({ x, y });
          // Remove the test building
          generator.removeBuilding(testBuilding.id);
        }
      }
    }

    return validPositions;
  }

  /**
   * Simple building placement - places buildings in the order provided without optimization
   */
  static optimizePlacement(
    buildings: Building[],
    generator: LayoutGenerator
  ): { placed: Building[]; failed: Building[] } {
    const placed: Building[] = [];
    const failed: Building[] = [];

    // Place buildings in the order they are provided (no sorting/optimization)
    for (const building of buildings) {
      const isPlaced = this.tryPlaceBuildingInAnyPlot(building, generator);
      if (isPlaced) {
        placed.push(building);
      } else {
        failed.push(building);
      }
    }

    return { placed, failed };
  }

  /**
   * Attempts to place a building in any available plot
   */
  private static tryPlaceBuildingInAnyPlot(
    building: Building,
    generator: LayoutGenerator
  ): boolean {
    for (const plot of generator.getPlots()) {
      if (this.tryPlaceBuildingInPlot(building, plot, generator)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Attempts to place a building in a specific plot
   */
  private static tryPlaceBuildingInPlot(
    building: Building,
    plot: Plot,
    generator: LayoutGenerator
  ): boolean {
    const validPositions = this.findValidPositionsInPlot(
      building,
      plot,
      generator
    );

    if (validPositions.length === 0) {
      return false;
    }

    // Simply use the first valid position found (no optimization)
    const placement = generator.placeBuilding(building, validPositions[0]);
    return placement.isValid;
  }

  /**
   * Generates a road network to connect all plots
   */
  static generateBasicRoadNetwork(generator: LayoutGenerator): void {
    const plots = generator.getPlots();

    // Create roads connecting plot centers horizontally and vertically
    for (const plot of plots) {
      const centerX = plot.position.x + Math.floor(plot.size.width / 2);
      const centerY = plot.position.y + Math.floor(plot.size.height / 2);

      // Place a road at the center of each plot (if not already occupied)
      generator.placeRoad({ x: centerX, y: centerY });

      // Connect to adjacent plots
      if (centerY > 1) {
        // Don't interfere with the infinite road at Y=0
        generator.placeRoad({ x: centerX, y: centerY - 1 });
      }
      generator.placeRoad({ x: centerX, y: centerY + 1 });
      generator.placeRoad({ x: centerX - 1, y: centerY });
      generator.placeRoad({ x: centerX + 1, y: centerY });
    }
  }

  /**
   * Calculates total revenue for all placed buildings, including bonuses
   */
  static calculateTotalRevenue(generator: LayoutGenerator): {
    totalCoinsRevenue: number;
    totalPassengersRevenue: number;
    coinsRevenuePerHour: number;
    passengersRevenuePerHour: number;
    buildingBreakdown: Array<{
      name: string;
      count: number;
      coinsRevenue: number;
      passengersRevenue: number;
      bonusedCoinsRevenue: number;
      bonusedPassengersRevenue: number;
    }>;
  } {
    let totalCoinsRevenue = 0;
    let totalPassengersRevenue = 0;
    let totalCoinsRevenuePerHour = 0;
    let totalPassengersRevenuePerHour = 0;
    const breakdown = new Map<
      string,
      {
        count: number;
        coinsRevenue: number;
        passengersRevenue: number;
        bonusedCoinsRevenue: number;
        bonusedPassengersRevenue: number;
      }
    >();

    for (const [_, building] of generator.getBuildings()) {
      const revenueResult = generator.calculateRevenueOutput(building);
      const baseCoinsRevenue = revenueResult.coins.baseOutput;
      const basePassengersRevenue = revenueResult.passengers.baseOutput;
      const bonusedCoinsRevenue = revenueResult.coins.finalOutput;
      const bonusedPassengersRevenue = revenueResult.passengers.finalOutput;

      totalCoinsRevenue += bonusedCoinsRevenue;
      totalPassengersRevenue += bonusedPassengersRevenue;

      const revenuePerHour = this.calculateRevenuePerHour(building, generator);
      if (building.type === "residential") {
        totalPassengersRevenuePerHour += revenuePerHour;
      } else if (
        building.type === "commercial" ||
        building.type === "decoration"
      ) {
        totalCoinsRevenuePerHour += revenuePerHour;
      }

      const existing = breakdown.get(building.name);
      if (existing) {
        existing.count++;
        existing.coinsRevenue += baseCoinsRevenue;
        existing.passengersRevenue += basePassengersRevenue;
        existing.bonusedCoinsRevenue += bonusedCoinsRevenue;
        existing.bonusedPassengersRevenue += bonusedPassengersRevenue;
      } else {
        breakdown.set(building.name, {
          count: 1,
          coinsRevenue: baseCoinsRevenue,
          passengersRevenue: basePassengersRevenue,
          bonusedCoinsRevenue: bonusedCoinsRevenue,
          bonusedPassengersRevenue: bonusedPassengersRevenue,
        });
      }
    }

    return {
      totalCoinsRevenue,
      totalPassengersRevenue,
      coinsRevenuePerHour: totalCoinsRevenuePerHour,
      passengersRevenuePerHour: totalPassengersRevenuePerHour,
      buildingBreakdown: Array.from(breakdown.entries()).map(
        ([name, data]) => ({
          name,
          count: data.count,
          coinsRevenue: data.coinsRevenue,
          passengersRevenue: data.passengersRevenue,
          bonusedCoinsRevenue: data.bonusedCoinsRevenue,
          bonusedPassengersRevenue: data.bonusedPassengersRevenue,
        })
      ),
    };
  }

  /**
   * Exports the current layout to a JSON string
   */
  static exportLayout(generator: LayoutGenerator): string {
    const grid = generator.getGrid();
    const buildings = Array.from(generator.getBuildings().values());
    const inventory = Array.from(generator.getBuildingInventory().entries());

    return JSON.stringify(
      {
        grid: {
          width: grid.width,
          height: grid.height,
          plots: grid.plots.map((plot) => ({
            id: plot.id,
            position: plot.position,
            size: plot.size,
          })),
        },
        buildings,
        inventory,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }
}

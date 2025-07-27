import prisma from "../../../config";
import type { Building } from "../../layout_generator/types";

export class BuildingService {
  /**
   * Fetches buildings from database by their names and converts them to Building type
   * @param buildingNames Array of building names to fetch
   * @returns Array of Building objects
   */
  static async getBuildingsByNames(
    buildingNames: string[]
  ): Promise<Building[]> {
    if (!buildingNames || buildingNames.length === 0) {
      return [];
    }

    try {
      const dbBuildings = await prisma.building.findMany({
        where: {
          name: {
            in: buildingNames,
          },
        },
      });

      return dbBuildings.map((dbBuilding) =>
        this.convertDbBuildingToBuilding(dbBuilding)
      );
    } catch (error) {
      console.error("Error fetching buildings from database:", error);
      throw new Error("Failed to fetch buildings from database");
    }
  }

  /**
   * Converts a database Building record to the Building type used by the layout generator
   * @param dbBuilding Database building record
   * @returns Building object for layout generator
   */
  private static convertDbBuildingToBuilding(dbBuilding: any): Building {
    const baseBuilding = {
      id: dbBuilding.id,
      name: dbBuilding.name,
      size: {
        width: dbBuilding.width,
        height: dbBuilding.height,
      },
    };

    // Handle different building types with their specific properties
    switch (dbBuilding.type) {
      case "residential":
        return {
          ...baseBuilding,
          type: "residential",
          requiresRoad: true,
          revenue: dbBuilding.revenue || 0,
          timeToRevenue: dbBuilding.timeToRevenue || 0,
        };

      case "commercial":
        return {
          ...baseBuilding,
          type: "commercial",
          requiresRoad: true,
          revenue: dbBuilding.revenue || 0,
          timeToRevenue: dbBuilding.timeToRevenue || 0,
        };

      case "decoration": {
        const decorationBuilding: Building = {
          ...baseBuilding,
          type: "decoration",
          requiresRoad: dbBuilding.requiresRoad,
        };

        // Add revenue properties if the decoration requires a road
        if (dbBuilding.requiresRoad) {
          (decorationBuilding as any).revenue = dbBuilding.revenue || 0;
          (decorationBuilding as any).timeToRevenue =
            dbBuilding.timeToRevenue || 0;
        }

        // Add bonus properties if they exist
        if (
          dbBuilding.bonusPercentage &&
          dbBuilding.bonusRadius &&
          dbBuilding.bonusType &&
          dbBuilding.neighborhoodType
        ) {
          (decorationBuilding as any).bonus = {
            type: dbBuilding.bonusType,
            percentage: dbBuilding.bonusPercentage,
            radius: dbBuilding.bonusRadius,
            neighborhoodType: dbBuilding.neighborhoodType,
          };
        }

        return decorationBuilding;
      }

      default:
        throw new Error(`Unknown building type: ${dbBuilding.type}`);
    }
  }

  /**
   * Get all available building names from the database
   * @returns Array of building names
   */
  static async getAllBuildingNames(): Promise<string[]> {
    try {
      const buildings = await prisma.building.findMany({
        select: {
          name: true,
        },
      });

      return buildings.map((b) => b.name);
    } catch (error) {
      console.error("Error fetching building names from database:", error);
      throw new Error("Failed to fetch building names from database");
    }
  }
}

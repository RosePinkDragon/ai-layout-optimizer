// Tile types: Empty (.), Plot border (P), Road (R), Building (B)
export type TileType = "empty" | "road" | "building" | "plot_border";

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Tile {
  type: TileType;
  buildingId?: string;
  isOccupied: boolean;
}

export type Building = {
  id: string;
  name: string;
  size: Size;
  position?: Position;
} & (
  | {
      type: "residential";
      requiresRoad: true;
      revenue: number;
      timeToRevenue: number;
    }
  | {
      type: "commercial";
      requiresRoad: true;
      revenue: number;
      timeToRevenue: number;
    }
  | {
      type: "decoration";
      revenue: number;
      timeToRevenue: number;
      bonus?: BuildingBonus;
      requiresRoad: true;
    }
  | {
      type: "decoration";
      bonus?: BuildingBonus;
      requiresRoad: false;
    }
);

export interface BuildingBonus {
  type: "coins" | "passengers";
  percentage: number; // e.g., 5 for 5%
  radius: number;
  neighborhoodType: "moore" | "manhattan"; // moore = 8-neighbor, manhattan = 4-neighbor
}

export interface Plot {
  id: string;
  position: Position;
  size: Size; // Always 4x4 for Airport City
  tiles: Tile[][];
}

export interface Grid {
  width: number;
  height: number;
  tiles: Tile[][];
  plots: Plot[];
}

export interface PlotConfiguration {
  plotsX: number; // Number of plots horizontally
  plotsY: number; // Number of plots vertically
  plotSize: Size; // Size of each plot (4x4)
}

export interface BuildingPlacement {
  building: Building;
  position: Position;
  plotId: string;
  isValid: boolean;
  hasRoadAccess: boolean;
}

export interface BonusCalculationResult {
  baseOutput: number;
  totalBonusPercentage: number;
  finalOutput: number;
  appliedBonuses: Array<{
    sourceBuilding: Building;
    bonusPercentage: number;
  }>;
}

export interface RevenueCalculationResult {
  coins: {
    baseOutput: number;
    totalBonusPercentage: number;
    finalOutput: number;
    appliedBonuses: Array<{
      sourceBuilding: Building;
      bonusPercentage: number;
    }>;
  };
  passengers: {
    baseOutput: number;
    totalBonusPercentage: number;
    finalOutput: number;
    appliedBonuses: Array<{
      sourceBuilding: Building;
      bonusPercentage: number;
    }>;
  };
}

export interface LayoutOptimizationResult {
  success: boolean;
  placedBuildings: Building[];
  failedBuildings: Building[];
  totalCoinsRevenue: number;
  totalPassengersRevenue: number;
  coinsRevenuePerHour: number;
  passengersRevenuePerHour: number;
  bonusAnalysis: Array<{
    building: Building;
    revenueResult: RevenueCalculationResult;
    affectedBuildings: Building[];
  }>;
  gridVisualization: string;
  validation: {
    isValid: boolean;
    errors: string[];
  };
}

export interface RoadPlacement {
  positions: Position[];
}

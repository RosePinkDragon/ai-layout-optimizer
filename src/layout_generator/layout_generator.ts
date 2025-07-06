import type {
  Grid,
  Plot,
  Building,
  Tile,
  Position,
  Size,
  PlotConfiguration,
  BuildingPlacement,
  BonusCalculationResult,
  RevenueCalculationResult,
} from "./types";

export class LayoutGenerator {
  private readonly grid: Grid;
  private readonly buildings: Map<string, Building> = new Map();
  private readonly buildingInventory: Map<string, number> = new Map();

  constructor(config: PlotConfiguration) {
    this.grid = this.createGrid(config);
  }
  /**
   * Creates the main grid with plots arranged in the specified configuration
   * The infinite road at Y=0 is outside the grid, so actual grid starts at Y=1
   */
  private createGrid(config: PlotConfiguration): Grid {
    const gridWidth = config.plotsX * config.plotSize.width;
    const gridHeight = config.plotsY * config.plotSize.height + 1; // +1 for road space

    // Initialize empty grid (road is at Y=0, playable area starts at Y=1)
    const tiles: Tile[][] = [];
    for (let y = 0; y < gridHeight; y++) {
      tiles[y] = [];
      for (let x = 0; x < gridWidth; x++) {
        if (y === 0) {
          // First row is the infinite road
          tiles[y][x] = {
            type: "road",
            isOccupied: true,
          };
        } else {
          // Rest is empty playable space
          tiles[y][x] = {
            type: "empty",
            isOccupied: false,
          };
        }
      }
    }

    // Create plots (starting from Y=1 since Y=0 is road)
    const plots: Plot[] = [];
    for (let plotY = 0; plotY < config.plotsY; plotY++) {
      for (let plotX = 0; plotX < config.plotsX; plotX++) {
        const plot = this.createPlot(
          plotX,
          plotY,
          config.plotSize,
          gridWidth,
          gridHeight
        );
        plots.push(plot);
      }
    }

    return {
      width: gridWidth,
      height: gridHeight,
      tiles,
      plots,
    };
  }

  /**
   * Creates a single plot at the specified grid position
   * Plots start at Y=1 since Y=0 is reserved for the infinite road
   */
  private createPlot(
    plotX: number,
    plotY: number,
    plotSize: Size,
    gridWidth: number,
    gridHeight: number
  ): Plot {
    const startX = plotX * plotSize.width;
    const startY = plotY * plotSize.height + 1; // +1 to account for road at Y=0

    // Check if plot has neighbors (requirement: each plot must have neighbors in at least 1 direction)
    const hasNeighbors = this.checkPlotNeighbors(
      plotX,
      plotY,
      gridWidth / plotSize.width,
      (gridHeight - 1) / plotSize.height // -1 to exclude road row
    );

    if (!hasNeighbors) {
      throw new Error(
        `Plot at (${plotX}, ${plotY}) has no neighbors in any direction`
      );
    }

    const plotTiles: Tile[][] = [];
    for (let y = 0; y < plotSize.height; y++) {
      plotTiles[y] = [];
      for (let x = 0; x < plotSize.width; x++) {
        plotTiles[y][x] = {
          type: "empty",
          isOccupied: false,
        };
      }
    }

    return {
      id: `plot_${plotX}_${plotY}`,
      position: { x: startX, y: startY },
      size: plotSize,
      tiles: plotTiles,
    };
  }

  /**
   * Checks if a plot has neighbors in at least one of the 4 directions
   */
  private checkPlotNeighbors(
    plotX: number,
    plotY: number,
    totalPlotsX: number,
    totalPlotsY: number
  ): boolean {
    const hasNorth = plotY > 0;
    const hasSouth = plotY < totalPlotsY - 1;
    const hasEast = plotX < totalPlotsX - 1;
    const hasWest = plotX > 0;

    return hasNorth || hasSouth || hasEast || hasWest;
  }

  /**
   * Places a road tile at the specified position within a plot
   */
  public placeRoad(position: Position): boolean {
    if (!this.isValidPosition(position) || position.y === 0) {
      return false; // Can't place road on the infinite road line
    }

    const plot = this.getPlotAtPosition(position);
    if (!plot) {
      return false;
    }

    const localPos = this.globalToLocalPosition(position, plot);
    if (!this.isValidLocalPosition(localPos, plot.size)) {
      return false;
    }

    // Update both grid and plot tiles
    this.grid.tiles[position.y][position.x] = {
      type: "road",
      isOccupied: true,
    };

    plot.tiles[localPos.y][localPos.x] = {
      type: "road",
      isOccupied: true,
    };

    return true;
  }

  /**
   * Attempts to place a building at the specified position
   */
  public placeBuilding(
    building: Building,
    position: Position
  ): BuildingPlacement {
    const placement: BuildingPlacement = {
      building,
      position,
      plotId: "",
      isValid: false,
      hasRoadAccess: false,
    };

    // Check if position is valid
    if (!this.isValidPosition(position)) {
      return placement;
    }

    // Find the plot containing this position
    const plot = this.getPlotAtPosition(position);
    if (!plot) {
      return placement;
    }

    placement.plotId = plot.id;

    // Check if building fits within the plot
    if (!this.buildingFitsInPlot(building, position, plot)) {
      return placement;
    }

    // Check for overlaps
    if (this.hasOverlap(building, position)) {
      return placement;
    }

    // Check road access if required
    const hasRoadAccess = building.requiresRoad
      ? this.hasRoadAccess(building, position)
      : true;

    placement.hasRoadAccess = hasRoadAccess;

    if (!hasRoadAccess && building.requiresRoad) {
      return placement;
    }

    // All checks passed
    placement.isValid = true;

    // Actually place the building
    this.occupyTiles(building, position);

    // Update building tracking
    building.position = position;
    this.buildings.set(building.id, building);

    // Update inventory
    const currentCount = this.buildingInventory.get(building.name) ?? 0;
    this.buildingInventory.set(building.name, currentCount + 1);

    return placement;
  }

  /**
   * Checks if a building fits entirely within a single plot
   */
  private buildingFitsInPlot(
    building: Building,
    position: Position,
    plot: Plot
  ): boolean {
    const buildingEndX = position.x + building.size.width - 1;
    const buildingEndY = position.y + building.size.height - 1;

    const plotEndX = plot.position.x + plot.size.width - 1;
    const plotEndY = plot.position.y + plot.size.height - 1;

    return (
      position.x >= plot.position.x &&
      position.y >= plot.position.y &&
      buildingEndX <= plotEndX &&
      buildingEndY <= plotEndY
    );
  }

  /**
   * Checks if a building overlaps with existing structures
   */
  private hasOverlap(building: Building, position: Position): boolean {
    for (let y = position.y; y < position.y + building.size.height; y++) {
      for (let x = position.x; x < position.x + building.size.width; x++) {
        if (!this.isValidPosition({ x, y })) {
          return true;
        }
        if (this.grid.tiles[y][x].isOccupied) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Checks if a building has road access (adjacent to at least one road tile)
   */
  private hasRoadAccess(building: Building, position: Position): boolean {
    const adjacentPositions = this.getAdjacentPositions(building, position);

    return adjacentPositions.some((pos) => {
      if (!this.isValidPosition(pos)) {
        return false;
      }
      return this.grid.tiles[pos.y][pos.x].type === "road";
    });
  }

  /**
   * Gets all positions adjacent to a building (4-neighborhood)
   */
  private getAdjacentPositions(
    building: Building,
    position: Position
  ): Position[] {
    const adjacent: Position[] = [];

    // Top edge
    for (let x = position.x; x < position.x + building.size.width; x++) {
      adjacent.push({ x, y: position.y - 1 });
    }

    // Bottom edge
    for (let x = position.x; x < position.x + building.size.width; x++) {
      adjacent.push({ x, y: position.y + building.size.height });
    }

    // Left edge
    for (let y = position.y; y < position.y + building.size.height; y++) {
      adjacent.push({ x: position.x - 1, y });
    }

    // Right edge
    for (let y = position.y; y < position.y + building.size.height; y++) {
      adjacent.push({ x: position.x + building.size.width, y });
    }

    return adjacent;
  }

  /**
   * Marks tiles as occupied by a building
   */
  private occupyTiles(building: Building, position: Position): void {
    for (let y = position.y; y < position.y + building.size.height; y++) {
      for (let x = position.x; x < position.x + building.size.width; x++) {
        this.grid.tiles[y][x] = {
          type: "building",
          buildingId: building.id,
          isOccupied: true,
        };
      }
    }
  }

  /**
   * Removes a building from the grid
   */
  public removeBuilding(buildingId: string): boolean {
    const building = this.buildings.get(buildingId);
    if (!building?.position) {
      return false;
    }

    // Clear tiles
    for (
      let y = building.position.y;
      y < building.position.y + building.size.height;
      y++
    ) {
      for (
        let x = building.position.x;
        x < building.position.x + building.size.width;
        x++
      ) {
        this.grid.tiles[y][x] = {
          type: "empty",
          isOccupied: false,
        };
      }
    }

    // Update tracking
    this.buildings.delete(buildingId);

    const currentCount = this.buildingInventory.get(building.name) ?? 0;
    if (currentCount > 0) {
      this.buildingInventory.set(building.name, currentCount - 1);
    }

    return true;
  }

  /**
   * Utility functions
   */
  private isValidPosition(position: Position): boolean {
    return (
      position.x >= 0 &&
      position.x < this.grid.width &&
      position.y >= 0 &&
      position.y < this.grid.height
    );
  }

  private isValidLocalPosition(position: Position, plotSize: Size): boolean {
    return (
      position.x >= 0 &&
      position.x < plotSize.width &&
      position.y >= 0 &&
      position.y < plotSize.height
    );
  }

  private getPlotAtPosition(position: Position): Plot | null {
    return (
      this.grid.plots.find((plot) => {
        return (
          position.x >= plot.position.x &&
          position.x < plot.position.x + plot.size.width &&
          position.y >= plot.position.y &&
          position.y < plot.position.y + plot.size.height
        );
      }) || null
    );
  }

  private globalToLocalPosition(globalPos: Position, plot: Plot): Position {
    return {
      x: globalPos.x - plot.position.x,
      y: globalPos.y - plot.position.y,
    };
  }

  /**
   * Public getters and utility methods
   */
  public getGrid(): Grid {
    return this.grid;
  }

  public getBuildings(): Map<string, Building> {
    return this.buildings;
  }

  public getBuildingInventory(): Map<string, number> {
    return this.buildingInventory;
  }

  public getPlots(): Plot[] {
    return this.grid.plots;
  }

  /**
   * Creates a visual representation of the grid
   */
  public visualizeGrid(): string {
    let result = "";
    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        const tile = this.grid.tiles[y][x];
        if (x === this.grid.width - 1) {
          result += this.getTileCharacter(tile); // Add space for alignment
        } else {
          result += this.getTileCharacter(tile) + " "; // Add space for alignment
        }
      }
      result += "\n";
    }
    return result;
  }

  /**
   * Gets the character representation for a tile
   */
  private getTileCharacter(tile: Tile): string {
    switch (tile.type) {
      case "empty":
        return ".";
      case "road":
        return "R";
      case "building":
        if (tile.buildingId) {
          const building = this.buildings.get(tile.buildingId);
          if (building) {
            return building.name.charAt(0).toUpperCase();
          }
        }
        return "B";
      default:
        return "?";
    }
  }

  /**
   * Validates the entire grid configuration
   */
  public validateGrid(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check that all plots have neighbors
    for (const plot of this.grid.plots) {
      const plotCoords = this.getPlotCoordinates(plot);
      const hasNeighbors = this.checkPlotNeighbors(
        plotCoords.x,
        plotCoords.y,
        Math.ceil(this.grid.width / 4),
        Math.ceil((this.grid.height - 1) / 4) // -1 to exclude road row
      );

      if (!hasNeighbors) {
        errors.push(`Plot ${plot.id} has no neighbors`);
      }
    }

    // Check that road exists at Y = 0
    let hasInfiniteRoad = true;
    for (let x = 0; x < this.grid.width; x++) {
      if (this.grid.tiles[0][x].type !== "road") {
        hasInfiniteRoad = false;
        break;
      }
    }

    if (!hasInfiniteRoad) {
      errors.push("Infinite road at Y = 0 is not properly initialized");
    }

    // Check that buildings requiring road access have it
    for (const [_, building] of this.buildings) {
      if (building.requiresRoad && building.position) {
        if (!this.hasRoadAccess(building, building.position)) {
          errors.push(
            `Building ${building.name} at (${building.position.x}, ${building.position.y}) requires road access but doesn't have it`
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculates the final output for a building considering all applicable bonuses
   */
  public calculateBonusOutput(building: Building): BonusCalculationResult {
    let baseOutput = 0;

    if (building.type === "residential" || building.type === "commercial") {
      baseOutput = building.revenue;
    }

    if (!building.position) {
      return {
        baseOutput,
        totalBonusPercentage: 0,
        finalOutput: baseOutput,
        appliedBonuses: [],
      };
    }

    const appliedBonuses: Array<{
      sourceBuilding: Building;
      bonusPercentage: number;
    }> = [];

    // Find all buildings that can provide bonuses to this building
    for (const [_, potentialBonusBuilding] of this.buildings) {
      if (
        potentialBonusBuilding.type === "residential" ||
        potentialBonusBuilding.type === "commercial"
      ) {
        continue; // Skip residential/commercial buildings as they don't provide bonuses
      }
      if (
        !potentialBonusBuilding.bonus ||
        !potentialBonusBuilding.position ||
        potentialBonusBuilding.id === building.id
      ) {
        continue;
      }

      // Check if the bonus building gives bonuses to buildings that provide coins/passengers
      const targetType = potentialBonusBuilding.bonus.type;
      const canReceiveBonus = this.buildingProvidesOutput(building, targetType);
      if (!canReceiveBonus) {
        continue;
      }

      // Check if building is within radius
      if (
        this.isBuildingWithinRadius(
          building,
          potentialBonusBuilding,
          potentialBonusBuilding.bonus.radius,
          potentialBonusBuilding.bonus.neighborhoodType
        )
      ) {
        appliedBonuses.push({
          sourceBuilding: potentialBonusBuilding,
          bonusPercentage: potentialBonusBuilding.bonus.percentage,
        });
      }
    }

    // Calculate total bonus percentage (additive)
    const totalBonusPercentage = appliedBonuses.reduce(
      (sum, bonus) => sum + bonus.bonusPercentage,
      0
    );

    // Calculate final output: baseOutput * (1 + totalBonus%) rounded up
    const finalOutput = Math.ceil(
      baseOutput * (1 + totalBonusPercentage / 100)
    );

    return {
      baseOutput,
      totalBonusPercentage,
      finalOutput,
      appliedBonuses,
    };
  }

  /**
   * Calculates separate revenue for coins and passengers with bonuses
   */
  public calculateRevenueOutput(building: Building): RevenueCalculationResult {
    if (!building.position) {
      return this.createEmptyRevenueResult(building);
    }

    let baseOutput = 0;

    if (
      building.type === "residential" ||
      building.type === "commercial" ||
      (building.type === "decoration" && building.requiresRoad === true)
    ) {
      baseOutput = building.revenue;
    }

    const coinsBonuses = this.calculateBonusesForType(building, "coins");
    const passengersBonuses = this.calculateBonusesForType(
      building,
      "passengers"
    );

    return {
      coins: this.calculateTypeRevenue(
        building,
        "coins",
        baseOutput,
        coinsBonuses
      ),
      passengers: this.calculateTypeRevenue(
        building,
        "passengers",
        baseOutput,
        passengersBonuses
      ),
    };
  }

  private createEmptyRevenueResult(
    building: Building
  ): RevenueCalculationResult {
    let baseOutput = 0;

    if (
      building.type === "residential" ||
      building.type === "commercial" ||
      (building.type === "decoration" && building.requiresRoad === true)
    ) {
      baseOutput = building.revenue;
    }

    return {
      coins: {
        baseOutput: this.buildingProvidesOutput(building, "coins")
          ? baseOutput
          : 0,
        totalBonusPercentage: 0,
        finalOutput: this.buildingProvidesOutput(building, "coins")
          ? baseOutput
          : 0,
        appliedBonuses: [],
      },
      passengers: {
        baseOutput: this.buildingProvidesOutput(building, "passengers")
          ? baseOutput
          : 0,
        totalBonusPercentage: 0,
        finalOutput: this.buildingProvidesOutput(building, "passengers")
          ? baseOutput
          : 0,
        appliedBonuses: [],
      },
    };
  }

  private calculateBonusesForType(
    building: Building,
    outputType: "coins" | "passengers"
  ): Array<{ sourceBuilding: Building; bonusPercentage: number }> {
    const bonuses: Array<{
      sourceBuilding: Building;
      bonusPercentage: number;
    }> = [];

    if (!this.buildingProvidesOutput(building, outputType)) {
      return bonuses;
    }

    for (const [_, potentialBonusBuilding] of this.buildings) {
      if (potentialBonusBuilding.type === "decoration") {
        if (
          this.shouldApplyBonus(building, potentialBonusBuilding, outputType)
        ) {
          bonuses.push({
            sourceBuilding: potentialBonusBuilding,
            bonusPercentage: potentialBonusBuilding.bonus!.percentage,
          });
        }
      }
    }

    return bonuses;
  }

  private shouldApplyBonus(
    targetBuilding: Building,
    bonusBuilding: Building & { type: "decoration" },
    outputType: "coins" | "passengers"
  ): boolean {
    return !!(
      bonusBuilding.bonus &&
      bonusBuilding.position &&
      bonusBuilding.id !== targetBuilding.id &&
      bonusBuilding.bonus.type === outputType &&
      this.isBuildingWithinRadius(
        targetBuilding,
        bonusBuilding,
        bonusBuilding.bonus.radius,
        bonusBuilding.bonus.neighborhoodType
      )
    );
  }

  private calculateTypeRevenue(
    building: Building,
    outputType: "coins" | "passengers",
    baseRevenue: number,
    bonuses: Array<{ sourceBuilding: Building; bonusPercentage: number }>
  ) {
    const baseOutput = this.buildingProvidesOutput(building, outputType)
      ? baseRevenue
      : 0;
    const totalBonusPercentage = bonuses.reduce(
      (sum, bonus) => sum + bonus.bonusPercentage,
      0
    );
    const finalOutput =
      baseOutput > 0
        ? Math.ceil(baseOutput * (1 + totalBonusPercentage / 100))
        : 0;

    return {
      baseOutput,
      totalBonusPercentage,
      finalOutput,
      appliedBonuses: bonuses,
    };
  }

  /**
   * Determines if a building provides the specified output type
   */
  private buildingProvidesOutput(
    building: Building,
    outputType: "coins" | "passengers"
  ): boolean {
    if (outputType === "coins") {
      // Commercial buildings and decorations produce coins
      return building.type === "commercial" || building.type === "decoration";
    } else if (outputType === "passengers") {
      // Residential buildings produce passengers
      return building.type === "residential";
    }
    return false;
  }

  /**
   * Checks if a building is within the specified radius of another building
   */
  private isBuildingWithinRadius(
    targetBuilding: Building,
    sourceBuilding: Building,
    radius: number,
    neighborhoodType: "moore" | "manhattan"
  ): boolean {
    if (!targetBuilding.position || !sourceBuilding.position) {
      return false;
    }

    // Get all positions occupied by both buildings
    const targetPositions = this.getBuildingOccupiedPositions(targetBuilding);
    const sourcePositions = this.getBuildingOccupiedPositions(sourceBuilding);

    // Check if any target position is within radius of any source position
    for (const targetPos of targetPositions) {
      for (const sourcePos of sourcePositions) {
        if (
          this.isWithinRadius(targetPos, sourcePos, radius, neighborhoodType)
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Gets all positions occupied by a building
   */
  private getBuildingOccupiedPositions(building: Building): Position[] {
    if (!building.position) {
      return [];
    }

    const positions: Position[] = [];
    for (
      let y = building.position.y;
      y < building.position.y + building.size.height;
      y++
    ) {
      for (
        let x = building.position.x;
        x < building.position.x + building.size.width;
        x++
      ) {
        positions.push({ x, y });
      }
    }
    return positions;
  }

  /**
   * Checks if position1 is within the specified radius of position2
   */
  private isWithinRadius(
    pos1: Position,
    pos2: Position,
    radius: number,
    neighborhoodType: "moore" | "manhattan"
  ): boolean {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);

    if (neighborhoodType === "moore") {
      // Moore neighborhood: max(dx, dy) <= radius (8-neighbor for radius 1)
      return Math.max(dx, dy) <= radius;
    } else {
      // Manhattan neighborhood: dx + dy <= radius (4-neighbor for radius 1)
      return dx + dy <= radius;
    }
  }

  /**
   * Gets all buildings that are affected by bonuses from a specific building
   */
  public getBuildingsAffectedByBonus(
    bonusBuilding: Building & { type: "decoration" }
  ): Building[] {
    if (!bonusBuilding.bonus || !bonusBuilding.position) {
      return [];
    }

    const affectedBuildings: Building[] = [];
    const targetType = bonusBuilding.bonus.type;

    for (const [_, building] of this.buildings) {
      if (
        building.id === bonusBuilding.id ||
        !building.position ||
        !this.buildingProvidesOutput(building, targetType)
      ) {
        continue;
      }

      if (
        this.isBuildingWithinRadius(
          building,
          bonusBuilding,
          bonusBuilding.bonus.radius,
          bonusBuilding.bonus.neighborhoodType
        )
      ) {
        affectedBuildings.push(building);
      }
    }

    return affectedBuildings;
  }

  private getPlotCoordinates(plot: Plot): Position {
    return {
      x: Math.floor(plot.position.x / 4),
      y: Math.floor((plot.position.y - 1) / 4), // -1 to account for road offset
    };
  }
}

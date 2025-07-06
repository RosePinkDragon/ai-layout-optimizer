import { describe, test, expect, beforeEach } from "bun:test";
import type { PlotConfiguration, Building } from "layout_generator/types";
import { LayoutGenerator } from "layout_generator/layout_generator";

describe("LayoutGenerator", () => {
  let generator: LayoutGenerator;
  let config: PlotConfiguration;

  beforeEach(() => {
    config = {
      plotsX: 2,
      plotsY: 2,
      plotSize: { width: 4, height: 4 },
    };
    generator = new LayoutGenerator(config);
  });

  describe("Grid Creation", () => {
    test("should create grid with correct dimensions", () => {
      const grid = generator.getGrid();
      expect(grid.width).toBe(8); // 2 plots * 4 width
      expect(grid.height).toBe(9); // 2 plots * 4 height + 1 for road
    });

    test("should create correct number of plots", () => {
      const plots = generator.getPlots();
      expect(plots).toHaveLength(4); // 2x2 = 4 plots
    });

    test("should initialize infinite road at Y=0", () => {
      const grid = generator.getGrid();
      for (let x = 0; x < grid.width; x++) {
        expect(grid.tiles[0][x].type).toBe("road");
        expect(grid.tiles[0][x].isOccupied).toBe(true);
      }
    });

    test("should create plots with correct positions", () => {
      const plots = generator.getPlots();

      // First plot should be at (0,1) - Y offset due to road
      const plot1 = plots.find((p) => p.id === "plot_0_0");
      expect(plot1?.position).toEqual({ x: 0, y: 1 });

      // Second plot should be at (4,1) - Y offset due to road
      const plot2 = plots.find((p) => p.id === "plot_1_0");
      expect(plot2?.position).toEqual({ x: 4, y: 1 });

      // Third plot should be at (0,5) - Y offset due to road
      const plot3 = plots.find((p) => p.id === "plot_0_1");
      expect(plot3?.position).toEqual({ x: 0, y: 5 });

      // Fourth plot should be at (4,5) - Y offset due to road
      const plot4 = plots.find((p) => p.id === "plot_1_1");
      expect(plot4?.position).toEqual({ x: 4, y: 5 });
    });

    test("should throw error for isolated plots", () => {
      const isolatedConfig: PlotConfiguration = {
        plotsX: 1,
        plotsY: 1,
        plotSize: { width: 4, height: 4 },
      };

      expect(() => new LayoutGenerator(isolatedConfig)).toThrow();
    });
  });

  describe("Road Placement", () => {
    test("should place road successfully in valid position", () => {
      const result = generator.placeRoad({ x: 1, y: 1 });
      expect(result).toBe(true);

      const grid = generator.getGrid();
      expect(grid.tiles[1][1].type).toBe("road");
      expect(grid.tiles[1][1].isOccupied).toBe(true);
    });

    test("should fail to place road at Y=0 (infinite road)", () => {
      const result = generator.placeRoad({ x: 1, y: 0 });
      expect(result).toBe(false);
    });

    test("should fail to place road outside grid bounds", () => {
      const result1 = generator.placeRoad({ x: -1, y: 1 });
      const result2 = generator.placeRoad({ x: 10, y: 1 });
      const result3 = generator.placeRoad({ x: 1, y: 10 });

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });

    test("should update both grid and plot tiles", () => {
      generator.placeRoad({ x: 1, y: 1 });

      const grid = generator.getGrid();
      const plot = generator.getPlots().find((p) => p.id === "plot_0_0");

      expect(grid.tiles[1][1].type).toBe("road");
      expect(plot?.tiles[0][1].type).toBe("road"); // Local position is (1,0) in plot
    });
  });

  describe("Building Placement", () => {
    let testBuilding: Building;

    beforeEach(() => {
      testBuilding = {
        id: "test_building",
        name: "Test Building",
        size: { width: 2, height: 2 },
        type: "residential",
        requiresRoad: true,
        revenue: 100,
        timeToRevenue: 3600,
      };
    });

    test("should place building successfully with road access", () => {
      // Place a road first
      generator.placeRoad({ x: 1, y: 1 });

      // Place building adjacent to road
      const placement = generator.placeBuilding(testBuilding, { x: 2, y: 1 });

      expect(placement.isValid).toBe(true);
      expect(placement.hasRoadAccess).toBe(true);
      expect(placement.plotId).toBe("plot_0_0");
    });

    test("should fail to place building without required road access", () => {
      // Try to place building without any adjacent roads
      const placement = generator.placeBuilding(testBuilding, { x: 2, y: 2 });

      expect(placement.isValid).toBe(false);
      expect(placement.hasRoadAccess).toBe(false);
    });

    test("should place decorative building without road access", () => {
      const decorativeBuilding: Building = {
        ...testBuilding,
        id: "decorative",
        type: "decoration",
        requiresRoad: false,
      };

      const placement = generator.placeBuilding(decorativeBuilding, {
        x: 2,
        y: 2,
      });

      expect(placement.isValid).toBe(true);
    });

    test("should fail to place overlapping buildings", () => {
      // Place first building
      generator.placeRoad({ x: 1, y: 1 });
      const placement1 = generator.placeBuilding(testBuilding, { x: 2, y: 1 });
      expect(placement1.isValid).toBe(true);

      // Try to place overlapping building
      const overlappingBuilding: Building = {
        ...testBuilding,
        id: "overlapping",
      };
      const placement2 = generator.placeBuilding(overlappingBuilding, {
        x: 3,
        y: 1,
      });

      expect(placement2.isValid).toBe(false);
    });

    test("should fail to place building outside plot bounds", () => {
      const largeBuilding: Building = {
        ...testBuilding,
        size: { width: 5, height: 5 },
      };

      const placement = generator.placeBuilding(largeBuilding, { x: 0, y: 1 });

      expect(placement.isValid).toBe(false);
    });

    test("should update building inventory when placed", () => {
      generator.placeRoad({ x: 1, y: 1 });
      generator.placeBuilding(testBuilding, { x: 2, y: 1 });

      const inventory = generator.getBuildingInventory();
      expect(inventory.get("Test Building")).toBe(1);
    });

    test("should track placed buildings", () => {
      generator.placeRoad({ x: 1, y: 1 });
      generator.placeBuilding(testBuilding, { x: 2, y: 1 });

      const buildings = generator.getBuildings();
      expect(buildings.has("test_building")).toBe(true);
      expect(buildings.get("test_building")?.position).toEqual({ x: 2, y: 1 });
    });
  });

  describe("Building Removal", () => {
    let testBuilding: Building;

    beforeEach(() => {
      testBuilding = {
        id: "test_building",
        name: "Test Building",
        size: { width: 2, height: 2 },
        type: "residential",
        requiresRoad: true,
        revenue: 100,
        timeToRevenue: 3600,
      };
    });

    test("should remove building successfully", () => {
      // Place building first
      generator.placeRoad({ x: 1, y: 1 });
      generator.placeBuilding(testBuilding, { x: 2, y: 1 });

      // Remove building
      const result = generator.removeBuilding("test_building");

      expect(result).toBe(true);
      expect(generator.getBuildings().has("test_building")).toBe(false);
    });

    test("should clear tiles when building is removed", () => {
      // Place building
      generator.placeRoad({ x: 1, y: 1 });
      generator.placeBuilding(testBuilding, { x: 2, y: 1 });

      // Remove building
      generator.removeBuilding("test_building");

      // Check tiles are cleared
      const grid = generator.getGrid();
      expect(grid.tiles[1][2].type).toBe("empty");
      expect(grid.tiles[1][2].isOccupied).toBe(false);
      expect(grid.tiles[1][3].type).toBe("empty");
      expect(grid.tiles[2][2].type).toBe("empty");
      expect(grid.tiles[2][3].type).toBe("empty");
    });

    test("should update inventory when building is removed", () => {
      // Place building
      generator.placeRoad({ x: 1, y: 1 });
      generator.placeBuilding(testBuilding, { x: 2, y: 1 });

      // Remove building
      generator.removeBuilding("test_building");

      const inventory = generator.getBuildingInventory();
      expect(inventory.get("Test Building")).toBe(0);
    });

    test("should fail to remove non-existent building", () => {
      const result = generator.removeBuilding("non_existent");
      expect(result).toBe(false);
    });
  });

  describe("Grid Validation", () => {
    test("should validate correct grid", () => {
      const validation = generator.validateGrid();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test("should detect buildings without required road access", () => {
      // Manually modify grid to create invalid state
      const testBuilding: Building = {
        id: "invalid_building",
        name: "Invalid Building",
        size: { width: 1, height: 1 },
        type: "residential",
        requiresRoad: true,
        revenue: 100,
        timeToRevenue: 3600,
        position: { x: 3, y: 3 },
      };

      // Force add building without proper validation
      generator.getBuildings().set("invalid_building", testBuilding);
      const grid = generator.getGrid();
      grid.tiles[3][3] = {
        type: "building",
        buildingId: "invalid_building",
        isOccupied: true,
      };

      const validation = generator.validateGrid();
      expect(validation.isValid).toBe(false);
      expect(
        validation.errors.some((error) =>
          error.includes("requires road access but doesn't have it")
        )
      ).toBe(true);
    });
  });

  describe("Grid Visualization", () => {
    test("should generate correct visualization", () => {
      const visualization = generator.visualizeGrid();
      const lines = visualization.split("\n");

      // Should have 9 lines (8 grid rows + road row + empty line at end)
      expect(lines).toHaveLength(10);

      // First line should be all roads
      expect(lines[0]).toBe("R R R R R R R R");

      // Other lines should be empty initially
      for (let i = 1; i < 9; i++) {
        expect(lines[i]).toBe(". . . . . . . .");
      }
      // last character in a line should not be a space
      expect(lines[9].slice(-1)).not.toBe(" "); //outputs R in this case
    });

    test("should show placed buildings and roads in visualization", () => {
      generator.placeRoad({ x: 1, y: 1 });

      const testBuilding: Building = {
        id: "test",
        name: "Test",
        size: { width: 1, height: 1 },
        type: "decoration",
        requiresRoad: false,
      };

      generator.placeBuilding(testBuilding, { x: 2, y: 2 });

      const visualization = generator.visualizeGrid();
      const lines = visualization.split("\n");
      // remove whitespace for easier testing
      for (let i = 0; i < lines.length; i++) {
        lines[i] = lines[i].replace(/\s/g, "");
      }
      expect(lines[1].charAt(1)).toBe("R"); // Road at (1,1)
      expect(lines[2].charAt(2)).toBe("T"); // Building name starting with T at (2,2)
    });
  });
});

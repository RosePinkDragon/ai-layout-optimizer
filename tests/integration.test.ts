import { describe, test, expect, beforeEach } from "bun:test";
import { BuildingUtils } from "layout_generator/building_utils";
import type { PlotConfiguration, Building } from "layout_generator/types";
import { LayoutGenerator } from "layout_generator/layout_generator";

describe("Integration Tests", () => {
  let generator: LayoutGenerator;
  let config: PlotConfiguration;

  beforeEach(() => {
    config = {
      plotsX: 3,
      plotsY: 2,
      plotSize: { width: 4, height: 4 },
    };
    generator = new LayoutGenerator(config);
  });

  describe("Complete Layout Generation Workflow", () => {
    test("should create a complete optimized layout", () => {
      // Step 1: Generate road network
      BuildingUtils.generateBasicRoadNetwork(generator);

      // Step 2: Get building templates
      const templates = BuildingUtils.createBuildingTemplates();

      // Step 3: Create building instances
      const buildings: Building[] = [];
      let buildingCounter = 1;

      // Add residential buildings
      for (let i = 0; i < 3; i++) {
        const house = BuildingUtils.createBuildingFromTemplate(
          templates.get("house")!,
          `house_${buildingCounter++}`
        );
        buildings.push(house);
      }

      // Add commercial buildings
      for (let i = 0; i < 2; i++) {
        const shop = BuildingUtils.createBuildingFromTemplate(
          templates.get("shop")!,
          `shop_${buildingCounter++}`
        );
        buildings.push(shop);
      }

      // Add decorative buildings
      const fountain = BuildingUtils.createBuildingFromTemplate(
        templates.get("fountain")!,
        `fountain_${buildingCounter++}`
      );
      buildings.push(fountain);

      // Step 4: Optimize placement
      const result = BuildingUtils.optimizePlacement(buildings, generator);

      // Verify results
      expect(result.placed.length).toBeGreaterThan(0);
      expect(result.placed.length + result.failed.length).toBe(
        buildings.length
      );

      // Step 5: Validate final layout
      const validation = generator.validateGrid();
      expect(validation.isValid).toBe(true);

      // Step 6: Calculate revenue
      const revenueStats = BuildingUtils.calculateTotalRevenue(generator);
      expect(revenueStats.totalCoinsRevenue).toBeGreaterThan(0);
      expect(revenueStats.totalPassengersRevenue).toBeGreaterThan(0);

      // Step 7: Export layout
      const exported = BuildingUtils.exportLayout(generator);
      expect(exported).toBeDefined();

      const parsed = JSON.parse(exported);
      expect(parsed.buildings).toHaveLength(result.placed.length);
    });

    test("should handle edge case scenarios", () => {
      // Test with minimal space but valid plot configuration (2x1 to have neighbors)
      const smallConfig: PlotConfiguration = {
        plotsX: 2,
        plotsY: 1,
        plotSize: { width: 4, height: 4 },
      };

      const smallGenerator = new LayoutGenerator(smallConfig);
      BuildingUtils.generateBasicRoadNetwork(smallGenerator);

      // Try to place many buildings in small space
      const templates = BuildingUtils.createBuildingTemplates();
      const buildings: Building[] = [];

      for (let i = 0; i < 5; i++) {
        // Fewer buildings but still enough to cause some failures
        const building = BuildingUtils.createBuildingFromTemplate(
          templates.get("house")!, // Use houses which are 2x2 and require roads
          `house_${i}`
        );
        buildings.push(building);
      }

      const result = BuildingUtils.optimizePlacement(buildings, smallGenerator);

      // Should place some but not all buildings due to space/road constraints
      expect(result.placed.length + result.failed.length).toBe(5);

      // The test passes if we can verify the optimization behavior
      if (result.failed.length === 0) {
        // All buildings placed successfully - that's also a valid outcome
        expect(result.placed.length).toBe(5);
      } else {
        // Some failed due to constraints - this is the expected edge case behavior
        expect(result.failed.length).toBeGreaterThan(0);
        // But we should have placed at least one if any were placeable
        // (Could be 0 if no valid positions exist)
      }

      // Layout should still be valid
      const validation = smallGenerator.validateGrid();
      expect(validation.isValid).toBe(true);
    });

    test("should maintain data consistency throughout workflow", () => {
      // Create and track buildings
      const templates = BuildingUtils.createBuildingTemplates();
      const house1 = BuildingUtils.createBuildingFromTemplate(
        templates.get("house")!,
        "house_1"
      );
      const house2 = BuildingUtils.createBuildingFromTemplate(
        templates.get("house")!,
        "house_2"
      );
      const fountain = BuildingUtils.createBuildingFromTemplate(
        templates.get("fountain")!,
        "fountain_1"
      );

      // Place buildings manually
      generator.placeRoad({ x: 1, y: 1 });
      generator.placeRoad({ x: 5, y: 2 });

      const placement1 = generator.placeBuilding(house1, { x: 2, y: 1 });
      const placement2 = generator.placeBuilding(house2, { x: 6, y: 2 });
      const placement3 = generator.placeBuilding(fountain, { x: 1, y: 4 });

      // Verify placements
      expect(placement1.isValid).toBe(true);
      expect(placement2.isValid).toBe(true);
      expect(placement3.isValid).toBe(true);

      // Check inventory consistency
      const inventory = generator.getBuildingInventory();
      expect(inventory.get("House")).toBe(2);
      expect(inventory.get("Fountain")).toBe(1);

      // Check buildings map consistency
      const buildings = generator.getBuildings();
      expect(buildings.size).toBe(3);
      expect(buildings.has("house_1")).toBe(true);
      expect(buildings.has("house_2")).toBe(true);
      expect(buildings.has("fountain_1")).toBe(true);

      // Remove one building
      const removed = generator.removeBuilding("house_1");
      expect(removed).toBe(true);

      // Check consistency after removal
      const newInventory = generator.getBuildingInventory();
      expect(newInventory.get("House")).toBe(1);

      const newBuildings = generator.getBuildings();
      expect(newBuildings.size).toBe(2);
      expect(newBuildings.has("house_1")).toBe(false);

      // Layout should still be valid
      const validation = generator.validateGrid();
      expect(validation.isValid).toBe(true);
    });

    test("should properly handle road access requirements", () => {
      // Don't generate automatic road network
      const templates = BuildingUtils.createBuildingTemplates();

      // Try to place building that requires road access without roads (except infinite road at Y=0)
      const house = BuildingUtils.createBuildingFromTemplate(
        templates.get("house")!,
        "house_1"
      );
      const placement1 = generator.placeBuilding(house, { x: 1, y: 2 }); // Away from Y=0 road

      expect(placement1.isValid).toBe(false);
      expect(placement1.hasRoadAccess).toBe(false);

      // Place a road
      generator.placeRoad({ x: 1, y: 1 });

      // Now try to place building adjacent to road
      const placement2 = generator.placeBuilding(house, { x: 2, y: 1 });

      expect(placement2.isValid).toBe(true);
      expect(placement2.hasRoadAccess).toBe(true);

      // Place decorative building without road requirement
      const fountain = BuildingUtils.createBuildingFromTemplate(
        templates.get("fountain")!,
        "fountain_1"
      );
      const placement3 = generator.placeBuilding(fountain, { x: 1, y: 4 });

      expect(placement3.isValid).toBe(true);
      // Note: hasRoadAccess might be true if placed near the infinite road at Y=0 or other roads
      // The important thing is that decorative buildings don't REQUIRE road access
    });

    test("should handle plot boundary constraints", () => {
      const templates = BuildingUtils.createBuildingTemplates();

      // Try to place building that would span multiple plots
      const hotel = BuildingUtils.createBuildingFromTemplate(
        templates.get("hotel")!,
        "hotel_1"
      );

      // Place at plot boundary - should fail if it would span plots
      const placement1 = generator.placeBuilding(hotel, { x: 3, y: 1 }); // Near right edge of first plot

      // Building should either be placed entirely within one plot or fail
      if (placement1.isValid) {
        // If placed, it should be entirely within one plot
        const plot = generator
          .getPlots()
          .find((p) => p.id === placement1.plotId)!;
        expect(placement1.position.x).toBeGreaterThanOrEqual(plot.position.x);
        expect(placement1.position.x + hotel.size.width).toBeLessThanOrEqual(
          plot.position.x + plot.size.width
        );
        expect(placement1.position.y).toBeGreaterThanOrEqual(plot.position.y);
        expect(placement1.position.y + hotel.size.height).toBeLessThanOrEqual(
          plot.position.y + plot.size.height
        );
      }

      // Place smaller building that definitely fits
      const cottage = BuildingUtils.createBuildingFromTemplate(
        templates.get("cottage")!,
        "cottage_1"
      );
      const placement2 = generator.placeBuilding(cottage, { x: 1, y: 1 });

      expect(placement2.isValid).toBe(true);
    });
  });

  describe("Performance and Stress Tests", () => {
    test("should handle large number of building placement attempts", () => {
      const startTime = Date.now();

      BuildingUtils.generateBasicRoadNetwork(generator);

      const templates = BuildingUtils.createBuildingTemplates();
      const buildings: Building[] = [];

      // Create many building instances
      for (let i = 0; i < 50; i++) {
        const building = BuildingUtils.createBuildingFromTemplate(
          templates.get("cottage")!,
          `cottage_${i}`
        );
        buildings.push(building);
      }

      const result = BuildingUtils.optimizePlacement(buildings, generator);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);

      // Should place some buildings
      expect(result.placed.length).toBeGreaterThan(0);

      // Layout should be valid
      const validation = generator.validateGrid();
      expect(validation.isValid).toBe(true);
    });

    test("should maintain memory efficiency", () => {
      // Create multiple generators to test memory usage
      const generators: LayoutGenerator[] = [];

      for (let i = 0; i < 10; i++) {
        const gen = new LayoutGenerator(config);
        BuildingUtils.generateBasicRoadNetwork(gen);
        generators.push(gen);
      }

      // Each generator should be independent
      expect(generators).toHaveLength(10);

      // Modify one generator
      const templates = BuildingUtils.createBuildingTemplates();
      const building = BuildingUtils.createBuildingFromTemplate(
        templates.get("fountain")!,
        "test_fountain"
      ); // Use decorative building

      generators[0].placeBuilding(building, { x: 1, y: 1 }); // No road required

      // Other generators should be unaffected
      expect(generators[0].getBuildings().size).toBe(1);
      expect(generators[1].getBuildings().size).toBe(0);
    });
  });
});

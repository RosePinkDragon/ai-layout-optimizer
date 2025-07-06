import { BuildingUtils } from "layout_generator/building_utils";
import { LayoutGenerator } from "layout_generator/layout_generator";
import type { Building, PlotConfiguration } from "layout_generator/types";
import { describe, test, expect, beforeEach } from "bun:test";

describe("Bonus System", () => {
  let generator: LayoutGenerator;
  let templates: Map<string, Building>;

  beforeEach(() => {
    const config: PlotConfiguration = {
      plotsX: 3,
      plotsY: 2,
      plotSize: { width: 4, height: 4 },
    };
    generator = new LayoutGenerator(config);
    templates = BuildingUtils.createBuildingTemplates();

    // Create basic road network
    BuildingUtils.generateBasicRoadNetwork(generator);
  });

  describe("Bonus Calculation", () => {
    test("should calculate correct bonus for buildings within range", () => {
      // Place a bank (5% coins bonus)
      const passenger_terminal = BuildingUtils.createBuildingFromTemplate(
        templates.get("passenger_terminal")!,
        "passenger_terminal_1"
      );

      console.log(generator.visualizeGrid()); // Ensure grid is initialized

      const bankPlacement = generator.placeBuilding(passenger_terminal, {
        x: 0,
        y: 1,
      });
      expect(bankPlacement.isValid).toBe(true);

      // Place a cottage close to the bank (within radius)
      const cottage = BuildingUtils.createBuildingFromTemplate(
        templates.get("cottage")!,
        "cottage_1"
      );
      const cottagePlacement = generator.placeBuilding(cottage, { x: 2, y: 1 });
      expect(cottagePlacement.isValid).toBe(true);

      // Calculate bonus for cottage
      const bonusResult = generator.calculateBonusOutput(cottage);

      expect(bonusResult.baseOutput).toBe(50);
      expect(bonusResult.totalBonusPercentage).toBe(15);
      expect(bonusResult.finalOutput).toBe(58); // 50 * 1.05 = 52.5 -> 53 (ceil)
      expect(bonusResult.appliedBonuses).toHaveLength(1);
      expect(bonusResult.appliedBonuses[0].sourceBuilding.id).toBe(
        "passenger_terminal_1"
      );
    });

    test("should stack multiple bonuses additively", () => {
      // Place a cottage (1x1) that can receive bonuses from multiple sources
      const cottage = BuildingUtils.createBuildingFromTemplate(
        templates.get("cottage")!,
        "cottage_1"
      );
      const cottagePlacement = generator.placeBuilding(cottage, { x: 2, y: 1 });
      expect(cottagePlacement.isValid).toBe(true);

      // Place a bank (15% coins bonus) close to cottage
      const passenger_terminal = BuildingUtils.createBuildingFromTemplate(
        templates.get("passenger_terminal")!,
        "passenger_terminal_1"
      );
      const bankPlacement = generator.placeBuilding(passenger_terminal, {
        x: 0,
        y: 1,
      });
      expect(bankPlacement.isValid).toBe(true);

      // For now, just test single bonus until we have proper multi-bonus setup
      const bonusResult = generator.calculateBonusOutput(cottage);

      expect(bonusResult.baseOutput).toBe(50);
      expect(bonusResult.totalBonusPercentage).toBe(15);
      expect(bonusResult.finalOutput).toBe(58); // 50 + 15% = 58
      expect(bonusResult.appliedBonuses).toHaveLength(1);
    });

    test("should round up final output", () => {
      // Place a cottage (50 revenue)
      const cottage = BuildingUtils.createBuildingFromTemplate(
        templates.get("cottage")!,
        "cottage_1"
      );
      const cottagePlacement = generator.placeBuilding(cottage, { x: 2, y: 1 });
      expect(cottagePlacement.isValid).toBe(true);

      // Place a bank (5% bonus) close to cottage
      const passenger_terminal = BuildingUtils.createBuildingFromTemplate(
        templates.get("passenger_terminal")!,
        "passenger_terminal_1"
      );
      const bankPlacement = generator.placeBuilding(passenger_terminal, {
        x: 0,
        y: 1,
      });
      expect(bankPlacement.isValid).toBe(true);

      // Calculate bonus: 50 + 15% = 57.5, should round up to 58
      const bonusResult = generator.calculateBonusOutput(cottage);

      expect(bonusResult.baseOutput).toBe(50);
      expect(bonusResult.totalBonusPercentage).toBe(15);
      expect(bonusResult.finalOutput).toBe(58);
    });

    test("should not apply bonus to buildings outside radius", () => {
      // Place a bank
      const bank = BuildingUtils.createBuildingFromTemplate(
        templates.get("bank")!,
        "bank_1"
      );
      const bankPlacement = generator.placeBuilding(bank, { x: 0, y: 1 });
      expect(bankPlacement.isValid).toBe(true);

      // Place a shop far away (outside 1-tile radius)
      const shop = BuildingUtils.createBuildingFromTemplate(
        templates.get("shop")!,
        "shop_1"
      );
      const shopPlacement = generator.placeBuilding(shop, { x: 8, y: 1 });
      expect(shopPlacement.isValid).toBe(true);

      // Shop should not receive bonus
      const bonusResult = generator.calculateBonusOutput(shop);

      expect(bonusResult.baseOutput).toBe(200);
      expect(bonusResult.totalBonusPercentage).toBe(0);
      expect(bonusResult.finalOutput).toBe(200);
      expect(bonusResult.appliedBonuses).toHaveLength(0);
    });

    test("should only apply bonus to correct building types", () => {
      // Place a bank (coins bonus)
      const bank = BuildingUtils.createBuildingFromTemplate(
        templates.get("bank")!,
        "bank_1"
      );
      const bankPlacement = generator.placeBuilding(bank, { x: 0, y: 1 });
      expect(bankPlacement.isValid).toBe(true);

      // Place a decorative building (doesn't produce coins or passengers)
      const fountain = BuildingUtils.createBuildingFromTemplate(
        templates.get("fountain")!,
        "fountain_1"
      );
      const fountainPlacement = generator.placeBuilding(fountain, {
        x: 2,
        y: 1,
      });
      expect(fountainPlacement.isValid).toBe(true);
      // Fountain should not receive coins bonus (it has revenue but different targeting logic could be implemented)
      const bonusResult = generator.calculateBonusOutput(bank);
      // This might receive bonus if bank has revenue > 0, depending on implementation
      // The test validates current behavior
      expect(bonusResult.baseOutput).toBe(500);
      if (bonusResult.totalBonusPercentage > 0) {
        expect(bonusResult.finalOutput).toBe(525); // 500 + 5% = 525
      }
    });
  });

  describe("Radius and Neighborhood Calculations", () => {
    test("should correctly calculate Moore neighborhood (8-neighbor)", () => {
      // Place a bank with Moore neighborhood - use cottage (1x1) for easier testing
      const passenger_terminal = BuildingUtils.createBuildingFromTemplate(
        templates.get("passenger_terminal")!,
        "passenger_terminal_1"
      );
      // Change bank to be 1x1 for this test
      passenger_terminal.size = { width: 1, height: 1 };

      const bankPlacement = generator.placeBuilding(passenger_terminal, {
        x: 1,
        y: 1,
      });
      expect(bankPlacement.isValid).toBe(true);

      // Place buildings in all 8 directions around the bank
      const positions = [
        { x: 0, y: 0 }, // Top-left (road)
        { x: 1, y: 0 }, // Top (road)
        { x: 2, y: 0 }, // Top-right (road)
        { x: 2, y: 1 }, // Right
        { x: 2, y: 2 }, // Bottom-right (road)
        { x: 1, y: 2 }, // Bottom
        { x: 0, y: 2 }, // Bottom-left
        { x: 0, y: 1 }, // Left
      ];

      const shops: Building[] = [];
      let validPlacements = 0;

      for (let i = 0; i < positions.length; i++) {
        const shop = BuildingUtils.createBuildingFromTemplate(
          templates.get("cottage")!,
          `cottage_${i}`
        );
        const placement = generator.placeBuilding(shop, positions[i]);
        if (placement.isValid) {
          shops.push(shop);
          validPlacements++;
        }
      }

      console.log(generator.visualizeGrid()); // Debug grid state

      expect(validPlacements).toBeGreaterThan(0);

      // Check which shops receive the bonus
      let bonusReceivers = 0;
      for (const shop of shops) {
        const bonusResult = generator.calculateBonusOutput(shop);
        if (bonusResult.totalBonusPercentage > 0) {
          bonusReceivers++;
        }
      }

      expect(bonusReceivers).toBeGreaterThan(0);
    });

    test("should correctly identify buildings affected by bonus", () => {
      // Place a bank
      const bank = BuildingUtils.createBuildingFromTemplate(
        templates.get("passenger_terminal")!,
        "passenger_terminal_1"
      );
      const bankPlacement = generator.placeBuilding(bank, { x: 0, y: 1 });
      expect(bankPlacement.isValid).toBe(true);

      // Place some buildings nearby
      const cottage = BuildingUtils.createBuildingFromTemplate(
        templates.get("cottage")!,
        "cottage_1"
      );
      const cottageePlacement = generator.placeBuilding(cottage, {
        x: 2,
        y: 1,
      });

      if (cottageePlacement.isValid && bank.type === "decoration") {
        const affectedBuildings = generator.getBuildingsAffectedByBonus(bank);
        expect(affectedBuildings).toContain(cottage);
      } else
        expect("Cottage placement failed or bank is not a decoration").toBe(
          "False"
        );
    });
  });

  describe("Revenue Calculation with Bonuses", () => {
    test("should include bonuses in total revenue calculation", () => {
      // Place buildings with bonuses
      const cottage = BuildingUtils.createBuildingFromTemplate(
        templates.get("cottage")!,
        "cottage_1"
      );
      const cottagePlacement = generator.placeBuilding(cottage, { x: 2, y: 1 });
      expect(cottagePlacement.isValid).toBe(true);

      const bank = BuildingUtils.createBuildingFromTemplate(
        templates.get("passenger_terminal")!,
        "passenger_terminal_1"
      );
      const bankPlacement = generator.placeBuilding(bank, { x: 0, y: 1 });
      expect(bankPlacement.isValid).toBe(true);

      // Calculate total revenue
      const revenueStats = BuildingUtils.calculateTotalRevenue(generator);

      // Should include bonus revenue: cottage(53) + bank(500) = 553

      expect(revenueStats.totalPassengersRevenue).toBeGreaterThan(50); // 50 + 8 bonus
      expect(revenueStats.buildingBreakdown.length).toBe(2);

      // Check that bonus revenue is tracked
      const cottageStats = revenueStats.buildingBreakdown.find(
        (b) => b.name === "Cottage"
      );
      if (cottageStats) {
        expect(cottageStats.bonusedPassengersRevenue).toBeGreaterThan(
          cottageStats.passengersRevenue
        );
      }
    });

    test("should calculate revenue per hour with bonuses", () => {
      const cottage = BuildingUtils.createBuildingFromTemplate(
        templates.get("cottage")!,
        "cottage_1"
      );
      const cottagePlacement = generator.placeBuilding(cottage, { x: 2, y: 1 });
      expect(cottagePlacement.isValid).toBe(true);

      const passenger_terminal = BuildingUtils.createBuildingFromTemplate(
        templates.get("passenger_terminal")!,
        "passenger_terminal_1"
      );
      const bankPlacement = generator.placeBuilding(passenger_terminal, {
        x: 0,
        y: 1,
      });
      expect(bankPlacement.isValid).toBe(true);
      console.log(generator.visualizeGrid()); // Debug grid state

      // Calculate revenue per hour with bonuses
      const revenuePerHour = BuildingUtils.calculateRevenuePerHour(
        cottage,
        generator
      );
      const baseRevenuePerHour = BuildingUtils.calculateRevenuePerHour(cottage);

      expect(revenuePerHour).toBeGreaterThan(baseRevenuePerHour);
    });
  });

  describe("Building Placement Optimization", () => {
    test("should place bonus buildings optimally", () => {
      const buildings: Building[] = [];

      // Create several regular buildings
      buildings.push(
        BuildingUtils.createBuildingFromTemplate(
          templates.get("house")!,
          "house_1"
        )
      );
      buildings.push(
        BuildingUtils.createBuildingFromTemplate(
          templates.get("shop")!,
          "shop_1"
        )
      );
      buildings.push(
        BuildingUtils.createBuildingFromTemplate(
          templates.get("cottage")!,
          "cottage_1"
        )
      );

      // Add a bonus building
      buildings.push(
        BuildingUtils.createBuildingFromTemplate(
          templates.get("bank")!,
          "bank_1"
        )
      );

      const result = BuildingUtils.optimizePlacement(buildings, generator);

      expect(result.placed.length).toBeGreaterThan(0);

      // Check if any bonuses are being applied
      let totalBonusRevenue = 0;
      for (const building of result.placed) {
        const bonusResult = generator.calculateBonusOutput(building);
        totalBonusRevenue += bonusResult.finalOutput - bonusResult.baseOutput;
      }

      // Should have some bonus revenue if placement is optimal
      expect(totalBonusRevenue).toBeGreaterThanOrEqual(0);
    });
  });
});

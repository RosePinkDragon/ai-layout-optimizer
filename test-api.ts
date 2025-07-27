#!/usr/bin/env bun

/**
 * API Test Script
 * Tests the AI Layout Optimizer API endpoints
 */

const API_BASE = "http://localhost:3000/api";

async function testAPI() {
  console.log("🧪 Testing AI Layout Optimizer API\n");

  try {
    // Test 1: Health Check
    console.log("1. Testing health endpoint...");
    const healthResponse = await fetch(`${API_BASE}/health`);
    const health = await healthResponse.json();
    console.log("✅ Health check:", health.status);

    // Test 2: Get buildings
    console.log("\n2. Testing buildings endpoint...");
    const buildingsResponse = await fetch(`${API_BASE}/buildings`);
    const buildings = await buildingsResponse.json();
    console.log(`✅ Found ${buildings.count} buildings`);
    console.log("📋 Sample buildings:", buildings.buildings.slice(0, 5));

    // Test 3: Layout optimization
    console.log("\n3. Testing layout optimization...");
    const optimizeResponse = await fetch(`${API_BASE}/optimize-layout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        buildingNames: ["Terminal H Level 1", "Runway", "Control Tower"],
        plotConfiguration: {
          plotsX: 3,
          plotsY: 3,
          plotSize: {
            width: 4,
            height: 4,
          },
        },
        roadPlacements: {
          positions: [
            { x: 1, y: 4 },
            { x: 5, y: 4 },
            { x: 9, y: 4 },
          ],
        },
      }),
    });

    const result = await optimizeResponse.json();

    if (result.success) {
      console.log("✅ Layout optimization successful");
      console.log(`📍 Placed buildings: ${result.placedBuildings.length}`);
      console.log(`❌ Failed buildings: ${result.failedBuildings.length}`);
      console.log(`💰 Total coins revenue: ${result.totalCoinsRevenue}`);
      console.log(
        `👥 Total passengers revenue: ${result.totalPassengersRevenue}`
      );
      console.log("\n📊 Grid Visualization:");
      console.log(result.gridVisualization);
    } else {
      console.log("❌ Layout optimization failed");
      console.log("Error:", result.error);
    }

    // Test 4: Error handling
    console.log("\n4. Testing error handling...");
    const errorResponse = await fetch(`${API_BASE}/optimize-layout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        buildingNames: [], // Empty array should cause error
        plotConfiguration: {
          plotsX: 2,
          plotsY: 2,
          plotSize: { width: 4, height: 4 },
        },
      }),
    });

    const errorResult = await errorResponse.json();
    if (errorResponse.status === 400) {
      console.log("✅ Error handling works correctly");
      console.log("📝 Error message:", errorResult.error);
    } else {
      console.log("❌ Error handling not working as expected");
    }

    console.log("\n🎉 All tests completed successfully!");
  } catch (error) {
    console.error("❌ API test failed:", error);
    console.log("\n💡 Make sure the API server is running with: bun run start");
  }
}

// Run tests
testAPI();

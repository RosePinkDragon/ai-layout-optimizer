# AI Layout Optimizer for Airport City

A standalone TypeScript library for optimizing Airport City mobile game layouts. This tool provides AI-powered building placement optimization with bonus calculations, revenue analysis, and grid visualization.

## Features

- 🎯 **Standalone Library:** Use as a TypeScript/JavaScript library in your own projects
- 🧠 **Intelligent Placement:** Optimizes building placement for maximum revenue and efficiency
- 🎁 **Bonus System:** Advanced bonus calculations with building synergies
- 📊 **Revenue Analysis:** Detailed revenue breakdown and per-hour calculations
- 🗺️ **Grid Visualization:** ASCII-based grid visualization for layout inspection
- 🛣️ **Flexible Roads:** Support for custom road networks or automatic generation
- ✅ **Validation:** Built-in layout validation and error reporting

## Installation

```bash
bun install
```

## Quick Start

```typescript
import { AILayoutOptimizer, optimizeLayout } from "./index";
import type { PlotConfiguration, Building } from "./types";

// Define your plot configuration
const plotConfig: PlotConfiguration = {
  plotsX: 2,
  plotsY: 2,
  plotSize: { width: 4, height: 4 },
};

// Create buildings
const buildings: Building[] = [
  AILayoutOptimizer.createBuilding("house", "house_1")!,
  AILayoutOptimizer.createBuilding("shop", "shop_1")!,
  AILayoutOptimizer.createBuilding("bank", "bank_1")!, // Bonus building
];

// Optimize layout
const result = optimizeLayout(plotConfig, buildings);

console.log(`Revenue: $${result.totalRevenue}`);
console.log(`Placed: ${result.placedBuildings.length} buildings`);
console.log(result.gridVisualization);
```

## API Reference

### `AILayoutOptimizer.optimizeLayout(plotConfig, buildings, roadPlacements?)`

Optimizes building layout for the given configuration.

**Parameters:**

- `plotConfig: PlotConfiguration` - Grid configuration (plots and size)
- `buildings: Building[]` - List of buildings to place
- `roadPlacements?: RoadPlacement` - Optional custom road placements

**Returns:** `LayoutOptimizationResult` - Complete optimization result with analysis

### `AILayoutOptimizer.createBuilding(templateName, buildingId)`

Creates a building from a predefined template.

**Parameters:**

- `templateName: string` - Template name (e.g., "house", "shop", "bank")
- `buildingId: string` - Unique ID for the building instance

**Returns:** `Building | null` - Building instance or null if template not found

### `AILayoutOptimizer.getBuildingTemplates()`

Returns all available building templates.

**Returns:** `Map<string, Building>` - Map of building templates by name

### `AILayoutOptimizer.validatePlotConfiguration(plotConfig)`

Validates a plot configuration.

**Parameters:**

- `plotConfig: PlotConfiguration` - Configuration to validate

**Returns:** `{isValid: boolean, errors: string[]}` - Validation result

## Building Templates

Available building templates include:

- **Residential:** `house`, `cottage`, `villa`
- **Commercial:** `shop`, `restaurant`, `bank` (with coin bonus)
- **Passenger:** `passenger_terminal` (with passenger bonus)
- **Decorations:** Various decorative buildings

## Examples

Run the example to see the library in action:

```bash
bun run example
```

## Running Tests

```bash
bun run test
```

## Layout Generator Architecture

**✅ Core Requirements:**

- The city is represented as a 2D tile grid.
- It consists of fixed 4x4 plots.
- Plots may be placed in **any shape**, such as rectangular (e.g., 2x3), **T-shaped**, **E-shaped**, **L-shaped**, etc.
- All plots are explicitly defined by the user by giving their top-left tile coordinates.
- **Each plot must have at least one 4-directional neighbor** (N/S/E/W).
- **Isolated plots ("islands") are not allowed**.
- Each plot can contain buildings and roads; buildings must fit fully within a single plot.
- Buildings must not overlap or exceed plot boundaries.
- An **infinite road runs along the full X-axis at Y = 0** and is always accessible.
- Roads can be placed freely on any tile.
- Only buildings marked as requiring road access must be adjacent to a road (in 4-neighborhood).
- Decorative and bonus buildings **do not need road access**.
- Buildings are all axis-aligned rectangles.
- The system should track tile states — e.g., empty, road, building type, etc.

**💡 Implementation Expectations:**

- Write code in **TypeScript** using **Bun** as the package manager.
- Define types/interfaces for:
  - Tile
  - Plot
  - Building
  - Road
  - Building Inventory
- Add utilities for:
  - Plot validation (must be connected)
  - Grid creation from user plot layout
  - Placement validation (boundary + overlap + road access if required)
  - 4-directional neighbor checking

## Implementation

The layout generator has been fully implemented in TypeScript with the following components:

### Core Classes

- **`LayoutGenerator`**: Main class that manages the grid, plots, and building placement
- **`BuildingUtils`**: Utility class with helper functions for optimization and analysis

### Key Features Implemented

✅ **Grid System**: 2D tile grid with configurable plot layout  
✅ **Plot Management**: Fixed 4x4 plots with neighbor validation  
✅ **Road System**: Infinite road at Y=0 plus user-placeable roads  
✅ **Building Placement**: Full validation with overlap and road access checks  
✅ **Building Templates**: Pre-defined building types (residential, commercial, decorative)  
✅ **Optimization**: Revenue-based placement optimization  
✅ **Validation**: Comprehensive grid and placement validation  
✅ **Export/Import**: JSON layout export functionality

### Usage Examples

```typescript
import { LayoutGenerator } from "./layout_generator";
import { BuildingUtils } from "./building_utils";

// Create a 2x3 plot configuration (8x12 grid)
const config = {
  plotsX: 2,
  plotsY: 3,
  plotSize: { width: 4, height: 4 },
};

const generator = new LayoutGenerator(config);

// Generate road network
BuildingUtils.generateBasicRoadNetwork(generator);

// Get building templates and create instances
const templates = BuildingUtils.createBuildingTemplates();
const house = BuildingUtils.createBuildingFromTemplate(
  templates.get("house")!,
  "house_1"
);

// Place building with validation
const placement = generator.placeBuilding(house, { x: 1, y: 2 });
console.log(`Placement successful: ${placement.isValid}`);

// Optimize multiple buildings
const buildings = [
  /* array of buildings */
];
const result = BuildingUtils.optimizePlacement(buildings, generator);
```

### Available Scripts

- `bun run start` - Run basic demo
- `bun run demo` - Run advanced optimization demo
- `bun run test` - Run complete test suite
- `bun run test:watch` - Run tests in watch mode
- `bun run test:coverage` - Run tests with coverage report
- `bun run dev` - Development mode with file watching

## Testing

This project includes a comprehensive test suite using **Bun's built-in test runner**.

### Test Coverage

- ✅ **49 tests** covering all major functionality
- ✅ **Grid management** and plot validation
- ✅ **Building placement** and road access logic
- ✅ **Optimization algorithms** and revenue calculations
- ✅ **Integration workflows** and edge cases
- ✅ **Performance testing** and memory efficiency

For detailed testing information, see [`tests/README.md`](tests/README.md).

## Contributing

Contributions are welcome! Please open issues or submit pull requests for new features or bug fixes.

## License

MIT License

---

_This project is not affiliated with or endorsed by Airport City or its developers._

# AI Layout Optimizer API

This API provides endpoints to optimize building layouts for Airport City mobile game using AI-powered layout generation.

## Getting Started

### Installation

```bash
bun install
```

### Start the API Server

```bash
# Development mode (with hot reload)
bun run api:dev

# Production mode
bun run start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### 1. Health Check

**GET** `/api/health`

Returns the health status of the API.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-07-28T10:30:00.000Z",
  "service": "AI Layout Optimizer API"
}
```

### 2. Get Available Buildings

**GET** `/api/buildings`

Returns all available building names from the database.

**Response:**

```json
{
  "success": true,
  "count": 150,
  "buildings": ["Building Name 1", "Building Name 2", ...]
}
```

### 3. Optimize Layout

**POST** `/api/optimize-layout`

Generates an optimized building layout based on the provided configuration.

**Request Body:**

```json
{
  "buildingNames": ["Terminal", "Runway", "Control Tower"],
  "plotConfiguration": {
    "plotsX": 3,
    "plotsY": 3,
    "plotSize": {
      "width": 4,
      "height": 4
    }
  },
  "roadPlacements": {
    "positions": [
      { "x": 1, "y": 1 },
      { "x": 2, "y": 1 },
      { "x": 3, "y": 1 }
    ]
  }
}
```

**Response:**

```json
{
  "success": true,
  "placedBuildings": [...],
  "failedBuildings": [...],
  "totalCoinsRevenue": 1500,
  "totalPassengersRevenue": 300,
  "coinsRevenuePerHour": 150,
  "passengersRevenuePerHour": 30,
  "bonusAnalysis": [...],
  "gridVisualization": "...",
  "validation": {
    "isValid": true,
    "errors": []
  },
  "metadata": {
    "requestedBuildings": 3,
    "foundBuildings": 3,
    "plotConfiguration": {...},
    "roadPlacements": {...}
  }
}
```

### 4. AI Auto-Optimize Layout

**POST** `/api/ai-optimize-layout`

🤖 **NEW AI-POWERED ENDPOINT**: Automatically generates and tests multiple road configurations to find the optimal layout for maximum revenue generation. The AI tests 5 different road placement strategies and returns the best performing layout.

**Request Body:**

```json
{
  "plotConfiguration": {
    "plotsX": 4,
    "plotsY": 4,
    "plotSize": {
      "width": 4,
      "height": 4
    }
  },
  "buildings": [
    { "name": "Cottage", "count": 3 },
    { "name": "Aero Club", "count": 1 },
    { "name": "Bowling Alley", "count": 2 },
    { "name": "Hotel", "count": 1 }
  ]
}
```

**Key Features:**

- 🚫 **No road placements required** - AI generates optimal road networks automatically
- 🔢 **Building counts supported** - Specify how many of each building type you want
- 🧠 **Multiple strategies tested** - AI tries 5 different road placement algorithms:
  1. No roads (rely on infinite road at Y=0)
  2. Central cross road network
  3. Grid road network
  4. Border roads around plots
  5. Minimal road network (sparse placement)
- 🏆 **Best layout selection** - Returns the configuration with highest total revenue
- 📊 **Revenue optimization** - Automatically maximizes coins + passengers revenue

**Response:**

```json
{
  "success": true,
  "placedBuildings": [...],
  "failedBuildings": [...],
  "totalCoinsRevenue": 2400,
  "totalPassengersRevenue": 800,
  "coinsRevenuePerHour": 240,
  "passengersRevenuePerHour": 80,
  "bonusAnalysis": [...],
  "gridVisualization": "R R R R R R R R R R R R R R R R\nC C C . . . H H . . . . B B . .\n. . . . . . H H . . . . B B . .\n. . . . . . . . . . . . . . . .\n...",
  "validation": {
    "isValid": true,
    "errors": []
  },
  "metadata": {
    "requestedBuildings": [
      { "name": "Cottage", "count": 3 },
      { "name": "Aero Club", "count": 1 },
      { "name": "Bowling Alley", "count": 2 },
      { "name": "Hotel", "count": 1 }
    ],
    "totalBuildingInstances": 8,
    "foundBuildingTypes": 4,
    "plotConfiguration": {...},
    "optimizationAttempts": 5,
    "isAIOptimized": true
  }
}
```

## Request Parameters

### PlotConfiguration

- `plotsX` (number): Number of plots horizontally
- `plotsY` (number): Number of plots vertically
- `plotSize` (object):
  - `width` (number): Width of each plot (typically 4 for Airport City)
  - `height` (number): Height of each plot (typically 4 for Airport City)

### RoadPlacements (optional)

- `positions` (array): Array of position objects with x and y coordinates where roads should be placed

### Building Names

An array of building names that exist in the database. Use the `/api/buildings` endpoint to get all available building names.

## Error Responses

The API returns appropriate HTTP status codes and error messages:

- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Requested buildings not found in database
- `500 Internal Server Error`: Server error during processing

Example error response:

```json
{
  "error": "buildingNames is required and must be a non-empty array"
}
```

## Examples

### Basic Layout Optimization

```bash
curl -X POST http://localhost:3000/api/optimize-layout \
  -H "Content-Type: application/json" \
  -d '{
    "buildingNames": ["Terminal", "Runway"],
    "plotConfiguration": {
      "plotsX": 2,
      "plotsY": 2,
      "plotSize": {
        "width": 4,
        "height": 4
      }
    }
  }'
```

### With Custom Road Placements

```bash
curl -X POST http://localhost:3000/api/optimize-layout \
  -H "Content-Type: application/json" \
  -d '{
    "buildingNames": ["Terminal", "Control Tower", "Hangar"],
    "plotConfiguration": {
      "plotsX": 3,
      "plotsY": 3,
      "plotSize": {
        "width": 4,
        "height": 4
      }
    },
    "roadPlacements": {
      "positions": [
        { "x": 0, "y": 4 },
        { "x": 1, "y": 4 },
        { "x": 2, "y": 4 }
      ]
    }
  }'
```

### 🤖 AI Auto-Optimization (Recommended)

```bash
curl -X POST http://localhost:3000/api/ai-optimize-layout \
  -H "Content-Type: application/json" \
  -d '{
    "plotConfiguration": {
      "plotsX": 4,
      "plotsY": 4,
      "plotSize": {
        "width": 4,
        "height": 4
      }
    },
    "buildings": [
      { "name": "Cottage", "count": 3 },
      { "name": "Aero Club", "count": 1 },
      { "name": "Bowling Alley", "count": 2 },
      { "name": "Hotel", "count": 1 }
    ]
  }'
```

### Large AI Optimization

```bash
curl -X POST http://localhost:3000/api/ai-optimize-layout \
  -H "Content-Type: application/json" \
  -d '{
    "plotConfiguration": {
      "plotsX": 5,
      "plotsY": 5,
      "plotSize": {
        "width": 4,
        "height": 4
      }
    },
    "buildings": [
      { "name": "Terminal", "count": 2 },
      { "name": "Control Tower", "count": 1 },
      { "name": "Hangar", "count": 3 },
      { "name": "Cottage", "count": 5 },
      { "name": "Hotel", "count": 2 },
      { "name": "Bakery", "count": 2 }
    ]
  }'
```

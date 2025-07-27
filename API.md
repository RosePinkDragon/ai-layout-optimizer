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

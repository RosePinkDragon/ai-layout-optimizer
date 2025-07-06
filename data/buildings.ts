import type { Building } from "../types";

export const buildings_list: Record<string, Building> = {
  house: {
    id: "",
    name: "House",
    size: { width: 2, height: 2 },
    type: "residential",
    requiresRoad: true,
    revenue: 100,
    timeToRevenue: 3600,
  },

  cottage: {
    id: "",
    name: "Cottage",
    size: { width: 1, height: 1 },
    type: "residential",
    requiresRoad: true,
    revenue: 50,
    timeToRevenue: 1800,
  },

  villa: {
    id: "",
    name: "Villa",
    size: { width: 3, height: 3 },
    type: "residential",
    requiresRoad: true,
    revenue: 300,
    timeToRevenue: 7200,
  },

  // Commercial buildings
  shop: {
    id: "",
    name: "Shop",
    size: { width: 2, height: 2 },
    type: "commercial",
    requiresRoad: true,
    revenue: 200,
    timeToRevenue: 1800,
  },

  restaurant: {
    id: "",
    name: "Restaurant",
    size: { width: 2, height: 2 },
    type: "commercial",
    requiresRoad: true,
    revenue: 400,
    timeToRevenue: 3600,
  },

  hotel: {
    id: "",
    name: "Hotel",
    size: { width: 3, height: 3 },
    type: "commercial",
    requiresRoad: true,
    revenue: 800,
    timeToRevenue: 10800,
  },

  bank: {
    id: "",
    name: "Bank",
    size: { width: 2, height: 2 },
    type: "commercial",
    requiresRoad: true,
    revenue: 500,
    timeToRevenue: 7200,
  },

  town_hall: {
    id: "",
    name: "Town Hall",
    size: { width: 3, height: 3 },
    type: "commercial",
    requiresRoad: true,
    revenue: 1000,
    timeToRevenue: 14400,
  },

  // Decorative buildings
  fountain: {
    id: "",
    name: "Fountain",
    size: { width: 1, height: 1 },
    type: "decoration",
    requiresRoad: false,
    bonus: {
      type: "coins",
      percentage: 5, // 5% bonus to coin-producing buildings
      radius: 1,
      neighborhoodType: "moore", // 8-neighbor (default for 1-tile radius)
    },
  },

  statue: {
    id: "",
    name: "Statue",
    size: { width: 1, height: 1 },
    type: "decoration",
    requiresRoad: false,
  },

  // Decorative passenger buildings
  park: {
    id: "",
    name: "Park",
    size: { width: 2, height: 2 },
    type: "decoration",
    requiresRoad: true,
    revenue: 0,
    timeToRevenue: 0,
    bonus: {
      type: "passengers",
      percentage: 5, // 5% bonus to coin-producing buildings
      radius: 1,
      neighborhoodType: "moore", // 8-neighbor (default for 1-tile radius)
    },
  },

  passenger_terminal: {
    id: "",
    name: "Passenger Terminal",
    size: { width: 2, height: 2 },
    type: "decoration",
    requiresRoad: true,
    revenue: 300,
    timeToRevenue: 5400,
    bonus: {
      type: "passengers",
      percentage: 15, // 15% bonus to passenger-producing buildings (residential)
      radius: 1,
      neighborhoodType: "moore",
    },
  },

  // decorative coin buildings
  small_lake: {
    id: "",
    name: "Small Lake",
    size: { width: 2, height: 2 },
    type: "decoration",
    requiresRoad: true,
    revenue: 0,
    timeToRevenue: 0,
    bonus: {
      type: "coins",
      percentage: 10, // 10% bonus to coin-producing buildings
      radius: 1,
      neighborhoodType: "moore", // 8-neighbor (default for 1-tile radius)
    },
  },
};

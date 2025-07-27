import axios from "axios";
import * as cheerio from "cheerio";
import get_building_info from "./get_building_info";
import prisma from "config";

const BASE_URL = "https://www.airportcitygame.com/";
const BUILDING_URL = BASE_URL + "/wiki/buildings/";

const allBuildingsUrlList = [
  // "wiki/residential_buildings",
  // "wiki/commercial_buildings",
  "wiki/airport_buildings",
  // "wiki/industries",
  // "wiki/decorations",
];

// Helper function to create building data for database
const createBuildingData = (
  buildingInfo: any,
  building: { link: string; name: string }
) => {
  const { requiresRoad, size, type } = buildingInfo;

  return {
    name: building.name,
    height: size?.height ?? 0,
    width: size?.width ?? 0,
    type: type ?? "decoration",
    requiresRoad: requiresRoad,
    revenue:
      (type === "decoration" && requiresRoad) || type !== "decoration"
        ? buildingInfo.revenue
        : 0,
    timeToRevenue:
      buildingInfo.type !== "decoration" ? buildingInfo.timeToRevenue : 0,
    bonusPercentage:
      buildingInfo.type === "decoration"
        ? buildingInfo.bonus?.percentage ?? 0
        : 0,
    bonusRadius:
      buildingInfo.type === "decoration" ? buildingInfo.bonus?.radius ?? 0 : 0,
    bonusType:
      buildingInfo.type === "decoration" ? buildingInfo.bonus?.type : undefined,
    neighborhoodType:
      buildingInfo.type === "decoration"
        ? buildingInfo.bonus?.neighborhoodType
        : undefined,
  };
};

// Helper function to process a single building
const processSingleBuilding = async (building: {
  link: string;
  name: string;
}) => {
  console.log(`Fetching info for: ${building.name}`);

  try {
    const existingBuilding = await prisma.building.findUnique({
      where: { name: building.name },
    });

    if (existingBuilding) {
      console.log(
        "Building already exists in the database:",
        existingBuilding.name
      );
      return;
    }

    const buildingInfo = await get_building_info(building.link, building.name);

    if (!buildingInfo) {
      console.error(`Failed to fetch info for building: ${building.name}`);
      return;
    }

    const buildingData = createBuildingData(buildingInfo, building);
    const createdBuilding = await prisma.building.create({
      data: buildingData,
    });

    console.info(
      "Building created: " +
        createdBuilding.name +
        " with ID: " +
        createdBuilding.id
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log(building);
      console.error("Axios error fetching buildings:", error.code);
    } else {
      console.error(
        `Error fetching or creating building info for: ${building.name}`,
        error
      );
    }
  }
};

// Helper function to process buildings in batches
const processBuildingsBatch = async (
  buildings: Array<{ link: string; name: string }>
) => {
  buildings.forEach(async (building) => {
    await processSingleBuilding(building);
  });
};

const fetchAllBuildingsForType = async (buildingUrl: string) => {
  try {
    const { data: html } = await axios.get(BASE_URL + buildingUrl);
    const $ = cheerio.load(html);

    const buildingsTableArray = $("div.bbTable table");

    if (buildingsTableArray.length === 0) {
      console.error("No buildings table found on the page.");
      return [];
    }

    console.log(`Found ${buildingsTableArray.length} tables on the page`);

    // Collect buildings from ALL tables, not just the first one
    const allBuildingsFromPage: Array<{ link: string; name: string }> = [];

    buildingsTableArray.each((tableIndex, table) => {
      const buildingsFromTable = $(table)
        .find("a")
        .map((_, el) => {
          let href = $(el).attr("href") || "";
          // Normalize the link to always be relative (building_name)
          let link = "";
          if (href.startsWith("http")) {
            // Full URL, extract after /wiki/
            const match = RegExp(/\/wiki\/(.+)$/).exec(href);
            link = match ? match[1] : "";
          } else if (href.startsWith("/wiki/")) {
            link = href.replace("/wiki/", "");
          } else {
            link = href;
          }
          const name = $(el).text().trim();
          return { link, name };
        })
        .get();

      console.log(
        `Table ${tableIndex + 1}: Found ${buildingsFromTable.length} buildings`
      );
      allBuildingsFromPage.push(...buildingsFromTable);
    });

    // Remove duplicates based on name
    const uniqueBuildings = allBuildingsFromPage.filter(
      (building, index, self) =>
        index === self.findIndex((b) => b.name === building.name)
    );

    if (uniqueBuildings.length === 0) {
      console.error("No buildings found on the page.");
      return [];
    }

    console.log(
      `Found ${uniqueBuildings.length} unique buildings total on the page`
    );
    return uniqueBuildings;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error fetching buildings:", error.code);
    } else console.error("Error fetching buildings:", error);
    return [];
  }
};

// Process buildings from a single page in batches
const processPageInBatches = async (
  buildingUrl: string,
  pageIndex: number,
  totalPages: number
) => {
  console.log(
    `\n=== Processing page ${pageIndex + 1}/${totalPages}: ${buildingUrl} ===`
  );

  const buildingsFromPage = await fetchAllBuildingsForType(buildingUrl);

  if (buildingsFromPage.length === 0) {
    console.log("No buildings found on this page, skipping...");
    return;
  }

  console.log(`Page has ${buildingsFromPage.length} buildings to process`);

  // Process buildings in batches of 25
  const batchSize = 25;
  const totalBatches = Math.ceil(buildingsFromPage.length / batchSize);

  for (let i = 0; i < buildingsFromPage.length; i += batchSize) {
    const batch = buildingsFromPage.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    console.log(
      `\nProcessing batch ${batchNumber}/${totalBatches} (${batch.length} buildings):`
    );
    console.log(batch.map((b) => b.name).join(", "));

    await processBuildingsBatch(batch);

    console.log(
      `✓ Completed batch ${batchNumber}/${totalBatches} for page ${
        pageIndex + 1
      }`
    );
  }

  console.log(
    `✓ Finished processing page ${pageIndex + 1}/${totalPages}: ${buildingUrl}`
  );
};

// Main execution function
const fetchAndProcessBuildings = async () => {
  console.log("Starting to fetch and process all buildings...");
  console.log(`Total pages to process: ${allBuildingsUrlList.length}`);

  // Process each page one at a time
  for (let i = 0; i < allBuildingsUrlList.length; i++) {
    const buildingUrl = allBuildingsUrlList[i];
    await processPageInBatches(buildingUrl, i, allBuildingsUrlList.length);
  }

  console.log("\n🎉 All pages and buildings processed!");
};

export default fetchAndProcessBuildings;

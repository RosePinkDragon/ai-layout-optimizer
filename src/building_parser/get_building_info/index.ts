import axios from "axios";
import * as cheerio from "cheerio";
import type { Building } from "layout_generator/types";

const base_url = "https://www.airportcitygame.com/wiki/";

export type RevenueInfo = {
  value: number;
  type: "coins" | "passengers" | "unknown";
};

function extractRevenue(input: string): RevenueInfo {
  const lower = input.toLowerCase();
  const valueMatch = RegExp(/\d+/).exec(input);
  const value = valueMatch ? parseInt(valueMatch[0], 10) : 0;

  let type: RevenueInfo["type"] = "unknown";
  if (lower.includes("coin")) type = "coins";
  else if (lower.includes("passenger")) type = "passengers";

  return { value, type };
}

const get_building_info = async (buildingId: string, buildingName: string) => {
  const { data: html } = await axios.get(base_url + buildingId);
  const $ = cheerio.load(html);

  const getValue = (label: string) =>
    $(`tr:contains(${label}) td`).last().text().replace(/\s+/g, " ").trim();

  const getBuildingType = (
    label: string
  ): "residential" | "commercial" | "decoration" => {
    const row = $(`tr:contains(${label})`).first();
    const valueCell = row.find("td").last();

    const text = valueCell
      .clone()
      .children()
      .remove()
      .end()
      .text()
      .trim()
      .toLowerCase();
    const imgAlt = valueCell.find("img").attr("alt")?.toLowerCase() || "";

    if (text.includes("passenger")) return "residential";
    if (text.includes("coin") || imgAlt.includes("coin")) return "commercial";
    return "decoration";
  };

  const sizeStr = getValue("Land Required:");
  const [width, height] = sizeStr.split("x").map(Number);

  const requiresRoad = getValue("Road Required:").toLowerCase() === "yes";

  const yieldTime = getValue("Yield Time:"); // this is in "hh mm" format
  const revenueStr = getBuildingType("Coins/Passengers:");

  if (!revenueStr) {
    throw new Error(
      `Revenue information not found for building: ${buildingName}`
    );
  }

  const bonusStrMain = getValue("Bonuses:");

  const bonusStrRewards = getValue("Rewards:");

  let bonusMatch = RegExp(
    /(\d+)%\s+Residential bonus\s+\/\s+Radius\s+(\d+)/i
  ).exec(bonusStrMain);
  if (
    !bonusMatch ||
    bonusStrMain.includes("None") ||
    bonusStrMain.includes("N/A")
  ) {
    bonusMatch = RegExp(
      /(\d+)%\s+Residential bonus\s+\/\s+Radius\s+(\d+)/i
    ).exec(bonusStrRewards);
  }

  const yeildTimeInSeconds =
    yieldTime === "None" || yieldTime === "N/A"
      ? 0
      : yieldTime.split(" ").reduce((acc, timePart) => {
          const [value, unit] = timePart.split(/(\d+)/).filter(Boolean);
          const timeValue = parseInt(value, 10);
          if (unit?.includes("h")) {
            return acc + timeValue * 3600; // convert hours to seconds
          } else if (unit?.includes("m")) {
            return acc + timeValue * 60; // convert minutes to seconds
          }
          return acc;
        }, 0);

  if (revenueStr === "residential" || revenueStr === "commercial") {
    const building: Building & {
      type: "residential" | "commercial";
    } = {
      name: buildingName,
      requiresRoad: true,
      type: revenueStr,
      size: { width, height },
      revenue: extractRevenue(revenueStr).value,
      timeToRevenue: yeildTimeInSeconds,
    };

    return building;
  }

  if (revenueStr === "decoration") {
    const building: Building & {
      type: "decoration";
    } = {
      name: buildingName,
      requiresRoad,
      type: revenueStr,
      size: { width, height },
      revenue: extractRevenue(revenueStr).value,
      timeToRevenue: yeildTimeInSeconds,
    };

    if (bonusMatch) {
      building.bonus = {
        type: bonusMatch[0].includes("Residential") ? "passengers" : "coins", // assumed from "Residential"
        percentage: parseInt(bonusMatch[1], 10),
        radius: parseInt(bonusMatch[2], 10),
        neighborhoodType: "moore", // assumed
      };
    }

    return building;
  }
};

export default get_building_info;

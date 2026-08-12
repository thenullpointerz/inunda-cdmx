import shp from "shpjs";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const zipBuffer = await readFile("data-raw/encharcamientos.zip");
const geojson = await shp(zipBuffer.buffer.slice(zipBuffer.byteOffset, zipBuffer.byteOffset + zipBuffer.byteLength));

const round = (n) => Math.round(n * 1e5) / 1e5;
const roundCoords = (coords) =>
  typeof coords[0] === "number" ? coords.map(round) : coords.map(roundCoords);
for (const fc of Array.isArray(geojson) ? geojson : [geojson]) {
  for (const feature of fc.features) {
    feature.geometry.coordinates = roundCoords(feature.geometry.coordinates);
  }
}

await mkdir("src/data", { recursive: true });
await writeFile("src/data/encharcamientos.json", JSON.stringify(geojson));

const featureCount = Array.isArray(geojson) ? geojson.reduce((n, fc) => n + fc.features.length, 0) : geojson.features.length;
console.log(`Wrote ${featureCount} features to src/data/encharcamientos.json`);
console.log("Sample properties:", JSON.stringify((Array.isArray(geojson) ? geojson[0] : geojson).features[0].properties, null, 2));

// Builds src/data/boroughs.json: per-borough facts used by the static SEO pages
// and the "about" panel. Run manually when the flood dataset changes:
//   node scripts/build-borough-data.mjs
//
// Borough boundaries come from SACMEX's open GeoServer. Each historical flood
// polygon is assigned to the borough that contains its centroid.
import { readFile, writeFile } from "node:fs/promises";

const BOUNDARIES_URL =
  "https://charcos.sacmex.cdmx.gob.mx/geoserver/sacmex-open/wfs?SERVICE=WFS&REQUEST=GetFeature&VERSION=2.0.0&TYPENAMES=sacmex-open%3Apoligonos_alcaldias_cdmx&OUTPUTFORMAT=application%2Fjson&SRSNAME=EPSG%3A4326";

const KM_PER_DEG_LAT = 110.57;
const KM_PER_DEG_LON_AT_CDMX = 111.32 * Math.cos((19.4 * Math.PI) / 180);

const round = (n, digits) => Math.round(n * 10 ** digits) / 10 ** digits;

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Shoelace area of one ring, in km^2 (planar approximation, fine at city scale).
function ringAreaKm2(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * KM_PER_DEG_LON_AT_CDMX * (y2 * KM_PER_DEG_LAT) - x2 * KM_PER_DEG_LON_AT_CDMX * (y1 * KM_PER_DEG_LAT);
  }
  return Math.abs(sum) / 2;
}

function polygonAreaKm2(rings) {
  const [outer, ...holes] = rings;
  return ringAreaKm2(outer) - holes.reduce((acc, hole) => acc + ringAreaKm2(hole), 0);
}

function polygonsOf(geometry) {
  return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
}

function geometryAreaKm2(geometry) {
  return polygonsOf(geometry).reduce((acc, rings) => acc + polygonAreaKm2(rings), 0);
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function pointInGeometry(point, geometry) {
  return polygonsOf(geometry).some(
    ([outer, ...holes]) => pointInRing(point, outer) && !holes.some((hole) => pointInRing(point, hole)),
  );
}

function bounds(geometry) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [outer] of polygonsOf(geometry)) {
    for (const [x, y] of outer) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, maxX, maxY };
}

function centroidOfOuterRing(geometry) {
  const [outer] = polygonsOf(geometry)[0];
  const pts = outer.slice(0, -1);
  return [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
}

const response = await fetch(BOUNDARIES_URL, { signal: AbortSignal.timeout(60000) });
if (!response.ok) throw new Error(`Boundaries request failed: ${response.status}`);
const boundaries = await response.json();
if (boundaries.features.length !== 16) throw new Error(`Expected 16 boroughs, got ${boundaries.features.length}`);

const floodZones = JSON.parse(await readFile("src/data/encharcamientos.json", "utf8"));

const boroughs = boundaries.features.map((feature) => {
  const b = bounds(feature.geometry);
  return {
    slug: slugify(feature.properties.NOMGEO),
    name: feature.properties.NOMGEO,
    geometry: feature.geometry,
    areaKm2: geometryAreaKm2(feature.geometry),
    bbox: b,
    floodZones: 0,
    floodAreaKm2: 0,
  };
});

let unassigned = 0;
for (const zone of floodZones.features) {
  const centroid = centroidOfOuterRing(zone.geometry);
  const owner = boroughs.find(
    (br) =>
      centroid[0] >= br.bbox.minX &&
      centroid[0] <= br.bbox.maxX &&
      centroid[1] >= br.bbox.minY &&
      centroid[1] <= br.bbox.maxY &&
      pointInGeometry(centroid, br.geometry),
  );
  if (!owner) {
    unassigned += 1;
    continue;
  }
  owner.floodZones += 1;
  owner.floodAreaKm2 += geometryAreaKm2(zone.geometry);
}

const ranked = [...boroughs].sort((a, b) => b.floodZones - a.floodZones);

const output = boroughs
  .map((br) => ({
    slug: br.slug,
    name: br.name,
    lat: round((br.bbox.minY + br.bbox.maxY) / 2, 4),
    lng: round((br.bbox.minX + br.bbox.maxX) / 2, 4),
    bounds: [
      [round(br.bbox.minY, 4), round(br.bbox.minX, 4)],
      [round(br.bbox.maxY, 4), round(br.bbox.maxX, 4)],
    ],
    areaKm2: round(br.areaKm2, 1),
    floodZones: br.floodZones,
    floodAreaKm2: round(br.floodAreaKm2, 2),
    floodSharePct: round((br.floodAreaKm2 / br.areaKm2) * 100, 1),
    rankByZones: ranked.findIndex((r) => r.slug === br.slug) + 1,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "es"));

await writeFile("src/data/boroughs.json", `${JSON.stringify(output, null, 2)}\n`);

const assigned = output.reduce((n, br) => n + br.floodZones, 0);
console.log(`Wrote ${output.length} boroughs. Flood zones assigned: ${assigned}/${floodZones.features.length} (unassigned: ${unassigned}).`);
for (const br of [...output].sort((a, b) => a.rankByZones - b.rankByZones)) {
  console.log(
    `${String(br.rankByZones).padStart(2)}. ${br.name.padEnd(24)} zones=${String(br.floodZones).padStart(3)}  floodArea=${String(br.floodAreaKm2).padStart(6)} km2  area=${String(br.areaKm2).padStart(6)} km2  share=${br.floodSharePct}%`,
  );
}

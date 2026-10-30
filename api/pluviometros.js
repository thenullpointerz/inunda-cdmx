// Live rain estimate for Mexico City, one point per borough.
//
// SACMEX's pluviometer API moved to SEGIAGUA and now requires a token tied to
// their own app, so this proxies Open-Meteo (free, keyless, model-based)
// instead. Values are estimates, not gauge readings, and the response says so.

const UPSTREAM = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 8000;

// [name, latitude, longitude] - approximate borough centroids.
const BOROUGHS = [
  ["Alvaro Obregon", 19.359, -99.203],
  ["Azcapotzalco", 19.487, -99.184],
  ["Benito Juarez", 19.372, -99.159],
  ["Coyoacan", 19.327, -99.162],
  ["Cuajimalpa", 19.357, -99.299],
  ["Cuauhtemoc", 19.433, -99.15],
  ["Gustavo A. Madero", 19.489, -99.11],
  ["Iztacalco", 19.396, -99.097],
  ["Iztapalapa", 19.355, -99.062],
  ["Magdalena Contreras", 19.3, -99.237],
  ["Miguel Hidalgo", 19.428, -99.203],
  ["Milpa Alta", 19.192, -99.023],
  ["Tlahuac", 19.286, -99.004],
  ["Tlalpan", 19.29, -99.167],
  ["Venustiano Carranza", 19.443, -99.11],
  ["Xochimilco", 19.257, -99.105],
];

function send(res, status, body, cacheControl) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", cacheControl);
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  const url = new URL(UPSTREAM);
  url.searchParams.set("latitude", BOROUGHS.map((b) => b[1]).join(","));
  url.searchParams.set("longitude", BOROUGHS.map((b) => b[2]).join(","));
  url.searchParams.set("current", "precipitation");
  url.searchParams.set("timezone", "America/Mexico_City");

  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!upstream.ok) throw new Error(`upstream status ${upstream.status}`);

    const data = await upstream.json();
    if (!Array.isArray(data) || data.length !== BOROUGHS.length) {
      throw new Error("unexpected upstream shape");
    }

    const stations = data.map((point, i) => {
      const [name, lat, lon] = BOROUGHS[i];
      const { precipitation, interval, time } = point.current;
      // "precipitation" covers the last `interval` seconds; normalise to mm/h.
      const mmPerHour = (Number(precipitation) * 3600) / Number(interval);
      return {
        id: i + 1,
        name,
        municipality: name,
        lat,
        lon,
        mm: Math.round(mmPerHour * 10) / 10,
        updatedAt: time,
      };
    });

    send(
      res,
      200,
      { source: "Open-Meteo", estimated: true, unit: "mm/h", stations },
      "s-maxage=300, stale-while-revalidate=300",
    );
  } catch {
    send(res, 502, { error: "upstream_unavailable" }, "no-store");
  }
}

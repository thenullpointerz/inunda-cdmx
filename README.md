# InundaCDMX

A live flood-risk map for Mexico City: historical flood-prone zones, real-time rain readings from SACMEX's official rain gauge network, and crowdsourced flood reports.

## Data sources

- **Historical risk zones** — CDMX open data portal ([datos.cdmx.gob.mx](https://datos.cdmx.gob.mx)), converted from shapefile to GeoJSON via `scripts/convert-shapefile.mjs`.
- **Live rain** — estimated hourly rainfall (mm/h) for each of the 16 boroughs from [Open-Meteo](https://open-meteo.com/), served through `api/pluviometros.js` (cached for 5 minutes). These are model estimates, not gauge readings: SACMEX's pluviometer API moved to SEGIAGUA and now requires a token tied to their own app. Levels use SACMEX's official thresholds (Ligera / Regular / Fuerte / Intensa / Torrencial). If the upstream is unavailable the UI says so instead of showing empty data.
- **Flood reports** — user-submitted pins stored in Supabase and auto-expiring after 4 hours. Without Supabase credentials they fall back to `localStorage`; if the backend is unreachable the report button is disabled.

## Stack

React + Vite, [react-leaflet](https://react-leaflet.js.org/) for the map, plain CSS. Deployed on Vercel as a static site with a small serverless function. Visits are measured with [Vercel Web Analytics](https://vercel.com/docs/analytics) (cookie-free); enable it in the project's Analytics tab.

## Development

```bash
npm install
npm run dev
```

To refresh the historical risk dataset:

```bash
node scripts/convert-shapefile.mjs
```

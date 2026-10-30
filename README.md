# InundaCDMX

A live flood-risk map for Mexico City: historical flood-prone zones, estimated live rain per borough, and crowdsourced flood reports.

> **Disclaimer.** InundaCDMX is an independent project, not affiliated with or endorsed by the Government of Mexico City, SEGIAGUA (formerly SACMEX) or the IPDP. Rain figures are model estimates, not an official alert. In an emergency call 911. See [DATA_SOURCES.md](DATA_SOURCES.md) for data credits and licences.

## Data sources

- **Historical risk zones** — CDMX open data portal ([datos.cdmx.gob.mx](https://datos.cdmx.gob.mx)), converted from shapefile to GeoJSON via `scripts/convert-shapefile.mjs`.
- **Live rain** — estimated hourly rainfall (mm/h) for each of the 16 boroughs from [Open-Meteo](https://open-meteo.com/), served through `api/pluviometros.js` (cached for 5 minutes). These are model estimates, not gauge readings: SACMEX's pluviometer API moved to SEGIAGUA and now requires a token tied to their own app. Levels use SACMEX's official thresholds (Ligera / Regular / Fuerte / Intensa / Torrencial). If the upstream is unavailable the UI says so instead of showing empty data.
- **Flood reports** — user-submitted pins stored in Supabase and auto-expiring after 4 hours. Without Supabase credentials they fall back to `localStorage`; if the backend is unreachable the report button is disabled.

## Stack

React + Vite, [react-leaflet](https://react-leaflet.js.org/) for the map, plain CSS. Deployed on Vercel as a static site with a small serverless function. Visits are measured with [Vercel Web Analytics](https://vercel.com/docs/analytics) (cookie-free); enable it in the project's Analytics tab.

## SEO pages

The map is a client-rendered app, so search engines get real text from static pages generated at build time:

- `/inundaciones/` and `/inundaciones/<borough>/` — one page per borough with zone counts and coverage computed from the flood dataset, plus links back to the map (`/?alcaldia=<slug>` centers the map on that borough).
- `sitemap.xml` — generated with every public URL.

`npm run build` runs `vite build` and then `scripts/generate-pages.mjs`, which reads `src/data/boroughs.json`.

## Development

```bash
npm install
npm run dev
```

The dev server does not serve the static SEO pages. To see them, build and preview:

```bash
npm run build
npm run preview
```

To refresh the historical risk dataset and the per-borough summary (borough boundaries come from SACMEX's open GeoServer):

```bash
node scripts/convert-shapefile.mjs
node scripts/build-borough-data.mjs
```

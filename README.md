# InundaCDMX

A live flood-risk map for Mexico City: historical flood-prone zones, real-time rain readings from SACMEX's official rain gauge network, and crowdsourced flood reports.

## Data sources

- **Historical risk zones** — CDMX open data portal ([datos.cdmx.gob.mx](https://datos.cdmx.gob.mx)), converted from shapefile to GeoJSON via `scripts/convert-shapefile.mjs`.
- **Live rain gauges** — [SACMEX's public pluviometer network](https://data.sacmex.cdmx.gob.mx/pluviometros/index.php/lluvia/mapa), proxied through `api/pluviometros.js` to avoid CORS. Rain levels follow SACMEX's own official scale (Ligera / Regular / Fuerte / Intensa / Torrencial).
- **Flood reports** — user-submitted pins, stored locally and auto-expiring after 4 hours.

## Stack

React + Vite, [react-leaflet](https://react-leaflet.js.org/) for the map, plain CSS. Deployed as a static site with a small serverless proxy function.

## Development

```bash
npm install
npm run dev
```

To refresh the historical risk dataset:

```bash
node scripts/convert-shapefile.mjs
```

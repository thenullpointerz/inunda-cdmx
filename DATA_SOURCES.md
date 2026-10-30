# Data sources and credits

InundaCDMX is an independent, free project. It is not affiliated with, sponsored by or endorsed by the Government of Mexico City, SEGIAGUA (formerly SACMEX) or the IPDP. Rain figures are model estimates, not gauge readings, and are not official alerts.

The user-facing credits live in `src/lib/credits.js` (shown in the app's "about" panel and on the static pages). Keep this file in sync with it.

## Data

| What | Source | Terms | Where it is credited |
|---|---|---|---|
| Historical flood-prone zones (`src/data/encharcamientos.json`) | "Sitios recurrentes de encharcamiento en Ciudad de México", Instituto de Planeación Democrática y Prospectiva (IPDP), Gobierno de la Ciudad de México — [dataset page](https://datos.cdmx.gob.mx/dataset/sitios-recurrentes-de-encharcamiento-en-ciudad-de-mexico) | Portal lists the licence id `CC-BY-4.0-ESP` (a Creative Commons Attribution 4.0 type; the portal gives no licence URL or definition of the `-ESP` suffix). CC BY 4.0 allows commercial use with attribution, a licence link, a note of changes and no implied endorsement. | Map legend (risk layer), about panel, static pages |
| Per-borough statistics (`src/data/boroughs.json`) | Borough boundary layer `poligonos_alcaldias_cdmx` from SEGIAGUA/SACMEX's open GeoServer (`charcos.sacmex.cdmx.gob.mx/geoserver/sacmex-open`) | The layer publishes no licence or terms. Used only to compute counts and approximate areas; the boundaries themselves are not redistributed. | About panel, static pages |
| Live rain estimates | [Open-Meteo](https://open-meteo.com/) forecast API, fetched server-side in `api/pluviometros.js` | Data under CC BY 4.0, with a link required where it is shown. The **free API is for non-commercial use only**; showing advertisements counts as commercial use and requires a paid plan. | Map legend (rain layer), about panel, static pages |
| Base map | OpenStreetMap standard tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) | ODbL data under the [OSMF tile usage policy](https://operations.osmfoundation.org/policies/tiles/): best-effort, no SLA, access can be withdrawn. | Attribution control on the map, about panel |
| Rain level names and thresholds (`src/lib/rainScale.js`) | Based on the scale SACMEX used in its rain-gauge map (3 / 7 / 13 / 20) | Origin and legal status not documented; applied here to model estimates, not gauge readings. | About panel |

## Derived data

- `src/data/encharcamientos.json` is the IPDP shapefile converted to GeoJSON with coordinates rounded to 5 decimals (`scripts/convert-shapefile.mjs`). The original zip is byte-identical to the file published on the dataset page (checked 2026-10-30).
- `src/data/boroughs.json` is produced by `scripts/build-borough-data.mjs`: each flood polygon is assigned to the borough containing its centroid, and areas use a planar approximation, so figures are approximate. About 4 of 344 polygons fall on borough edges and are not assigned.

## Services

- **Vercel** hosts the site. Its Hobby plan is for non-commercial use; advertising requires the Pro plan.
- **Supabase** stores anonymous flood reports (latitude, longitude, timestamp). Free projects pause after about a week of inactivity.
- **Vercel Web Analytics** counts page views without cookies.

## Open points

- Meaning of `CC-BY-4.0-ESP`: ask datosabiertos@cdmx.gob.mx.
- Terms of the SEGIAGUA/SACMEX GeoServer layers: ask SEGIAGUA, or switch to INEGI's Marco Geoestadístico, whose terms are explicit.
- Official source of the rain scale thresholds.

// Single source of truth for data credits and the disclaimer. Used by the app's
// "about" panel and, at build time, by scripts/generate-pages.mjs. User-facing
// text is Spanish on purpose; keep DATA_SOURCES.md in sync when this changes.

export const FLOOD_ZONES_URL =
  "https://datos.cdmx.gob.mx/dataset/sitios-recurrentes-de-encharcamiento-en-ciudad-de-mexico";
export const OPEN_METEO_URL = "https://open-meteo.com/";
export const CC_BY_URL = "https://creativecommons.org/licenses/by/4.0/deed.es";
export const OSM_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";

export const SOURCES = [
  {
    id: "flood-zones",
    title: "Zonas con historial de encharcamiento",
    description:
      "«Sitios recurrentes de encharcamiento en Ciudad de México», Instituto de Planeación Democrática y Prospectiva (IPDP), Gobierno de la Ciudad de México. Licencia indicada en el portal: CC-BY-4.0-ESP (tipo Creative Commons Atribución 4.0). Datos simplificados y procesados por InundaCDMX; no es una publicación oficial.",
    links: [
      { label: "Conjunto de datos", href: FLOOD_ZONES_URL },
      { label: "CC BY 4.0", href: CC_BY_URL },
    ],
  },
  {
    id: "rain",
    title: "Lluvia estimada",
    description:
      "Estimación por modelo meteorológico para cada alcaldía, no mediciones de estaciones.",
    links: [{ label: "Weather data by Open-Meteo.com", href: OPEN_METEO_URL }],
  },
  {
    id: "basemap",
    title: "Mapa base",
    description: "© colaboradores de OpenStreetMap, datos bajo la licencia ODbL.",
    links: [{ label: "OpenStreetMap", href: OSM_COPYRIGHT_URL }],
  },
  {
    id: "boroughs",
    title: "Límites de alcaldías",
    description:
      "Capa de límites del GeoServer abierto de SEGIAGUA (antes SACMEX), usada solo para calcular las estadísticas por alcaldía de este sitio. La capa no publica una licencia.",
    links: [],
  },
  {
    id: "rain-scale",
    title: "Niveles de lluvia",
    description:
      "Los nombres y umbrales (Ligera, Regular, Fuerte, Intensa, Torrencial) se basan en la escala que usaba SACMEX en su mapa de pluviómetros. Aquí se aplican a una estimación de modelo.",
    links: [],
  },
];

export const DISCLAIMER =
  "InundaCDMX es un proyecto independiente y gratuito. No está afiliado, patrocinado ni respaldado por el Gobierno de la Ciudad de México, SEGIAGUA (antes SACMEX) ni el IPDP. La lluvia mostrada es una estimación de modelo, no una medición de estaciones, y no es una alerta oficial ni sustituye los avisos de Protección Civil. Los reportes ciudadanos no están verificados. En una emergencia, llama al 911.";

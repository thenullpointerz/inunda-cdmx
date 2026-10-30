// Post-build step: writes static, crawlable HTML into dist/ so search engines get
// real text without running the map app.
//   dist/inundaciones/index.html           borough index
//   dist/inundaciones/<slug>/index.html    one page per borough
//   dist/sitemap.xml                       every public URL
//
// Runs after `vite build` (see the "build" script in package.json).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { DISCLAIMER, SOURCES, OPEN_METEO_URL } from "../src/lib/credits.js";

const SITE = "https://inunda-cdmx.vercel.app";
const DIST = "dist";

const boroughs = JSON.parse(await readFile("src/data/boroughs.json", "utf8"));
const totalZones = boroughs.reduce((n, b) => n + b.floodZones, 0);
const avgSharePct = boroughs.reduce((n, b) => n + b.floodSharePct, 0) / boroughs.length;

const number = (n, digits = 1) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: digits });

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const boroughUrl = (b) => `/inundaciones/${b.slug}/`;
const mapUrl = (b) => `/?alcaldia=${b.slug}`;

function nearestBoroughs(borough, count = 3) {
  return boroughs
    .filter((b) => b.slug !== borough.slug)
    .map((b) => ({ b, d: (b.lat - borough.lat) ** 2 + (b.lng - borough.lng) ** 2 }))
    .sort((x, y) => x.d - y.d)
    .slice(0, count)
    .map((x) => x.b);
}

const STYLE = `
:root{--bg:#f4f3ee;--card:#fff;--text:#1c1b17;--muted:#6b6a63;--border:#e4e2d9;--accent:#185fa5;--accent-bg:#e6f1fb;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#16171a;--card:#1f2024;--text:#f0efe9;--muted:#a9a89f;--border:#35363b;--accent:#85b7eb;--accent-bg:#0c447c}}
*{box-sizing:border-box}
body{margin:0;font:16px/1.6 system-ui,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--text)}
a{color:var(--accent)}
header{border-bottom:1px solid var(--border);background:var(--card)}
.wrap{max-width:760px;margin:0 auto;padding:0 16px}
.top{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;max-width:760px;margin:0 auto;font-size:15px}
.top a{text-decoration:none;font-weight:600}
main{padding:24px 16px 48px}
h1{font-size:28px;line-height:1.25;margin:0 0 8px}
h2{font-size:20px;margin:32px 0 8px}
.lead{color:var(--muted);margin:0 0 20px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:20px 0}
.stat{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 14px}
.stat b{display:block;font-size:24px;line-height:1.2}
.stat span{font-size:13px;color:var(--muted)}
.cta{display:inline-block;margin:8px 0;padding:10px 18px;border-radius:8px;background:var(--accent);color:var(--bg);font-weight:600;text-decoration:none}
.note{font-size:14px;color:var(--muted);background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 14px}
ul.links{padding-left:20px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden;font-size:15px}
th,td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)}
th{font-size:13px;color:var(--muted);font-weight:600}
td.num,th.num{text-align:right}
footer{padding:0 16px 40px;font-size:13px;color:var(--muted)}footer ul{padding-left:18px}footer li{margin-bottom:6px}
`;

function sourceItem(source) {
  const links = source.links.map((l) => `<a href="${l.href}" rel="noopener">${esc(l.label)}</a>`).join(" · ");
  return `<li><strong>${esc(source.title)}.</strong> ${esc(source.description)} ${links}</li>`;
}

function layout({ title, description, urlPath, body, breadcrumbs }) {
  const url = `${SITE}${urlPath}`;
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE}${c.path}`,
    })),
  };
  return `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:site_name" content="InundaCDMX">
<meta property="og:locale" content="es_MX">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(crumbs)}</script>
<style>${STYLE}</style>
</head>
<body>
<header><div class="top"><a href="/">InundaCDMX</a><a href="/inundaciones/">Alcaldías</a></div></header>
<main class="wrap">
${body}
</main>
<footer class="wrap">
<p><strong>Aviso.</strong> ${esc(DISCLAIMER)}</p>
<p><strong>Fuentes y créditos.</strong> Las cifras de esta página son cálculos aproximados de InundaCDMX a partir de los polígonos publicados; no son cifras oficiales.</p>
<ul>
${SOURCES.map(sourceItem).join("")}
</ul>
</footer>
</body>
</html>
`;
}

function boroughPage(b) {
  const near = nearestBoroughs(b);
  const diff = b.floodSharePct - avgSharePct;
  const comparison =
    Math.abs(diff) < 1
      ? "similar al promedio de las 16 alcaldías"
      : diff > 0
        ? `por encima del promedio de las 16 alcaldías (${number(avgSharePct)}%)`
        : `por debajo del promedio de las 16 alcaldías (${number(avgSharePct)}%)`;
  const title = `Inundaciones en ${b.name}, CDMX: zonas de encharcamiento y lluvia`;
  const description = `${b.name} tiene ${b.floodZones} zonas con historial de encharcamiento (cerca del ${number(b.floodSharePct)}% de su territorio) según datos abiertos de la CDMX. Consulta el mapa y la lluvia estimada.`;

  const body = `
<nav aria-label="Ruta"><a href="/">Inicio</a> › <a href="/inundaciones/">Inundaciones por alcaldía</a> › ${esc(b.name)}</nav>
<h1>Inundaciones en ${esc(b.name)}, Ciudad de México</h1>
<p class="lead">Resumen de las zonas con historial de encharcamiento en ${esc(b.name)} y acceso directo al mapa con lluvia estimada.</p>

<div class="stats">
<div class="stat"><b>${b.floodZones}</b><span>zonas con historial de encharcamiento</span></div>
<div class="stat"><b>${number(b.floodAreaKm2)} km²</b><span>superficie aproximada de esas zonas</span></div>
<div class="stat"><b>${number(b.floodSharePct)}%</b><span>del territorio de la alcaldía</span></div>
<div class="stat"><b>#${b.rankByZones} de 16</b><span>por número de zonas registradas</span></div>
</div>

<a class="cta" href="${mapUrl(b)}">Ver el mapa de ${esc(b.name)}</a>

<h2>Qué dicen los datos</h2>
<p>En los datos abiertos de la Ciudad de México hay ${b.floodZones} zonas con historial de encharcamiento cuyo centro cae dentro de ${esc(b.name)}, de ${totalZones} ubicadas dentro de los límites de las 16 alcaldías. En conjunto cubren aproximadamente ${number(b.floodAreaKm2)} km² de los ${number(b.areaKm2)} km² de la alcaldía, es decir, cerca del ${number(b.floodSharePct)}% de su territorio, ${comparison}.</p>
<p>Es un registro histórico: indica dónde se han presentado encharcamientos, no predice dónde ocurrirán hoy. Para ver las zonas sobre el mapa, activa la capa «Riesgo historico» en InundaCDMX.</p>

<h2>Lluvia en ${esc(b.name)} ahora</h2>
<p>El mapa muestra una estimación de lluvia por alcaldía en milímetros por hora, calculada con un modelo meteorológico (<a href="${OPEN_METEO_URL}" rel="noopener">Weather data by Open-Meteo.com</a>) y actualizada cada pocos minutos. Son estimaciones, no lecturas de pluviómetros oficiales. <a href="${mapUrl(b)}">Abre el mapa centrado en ${esc(b.name)}</a> para ver el nivel de lluvia actual.</p>

<h2>Si hay una inundación</h2>
<p>Si hay riesgo inmediato, llama al 911. Para avisos oficiales, consulta a la Secretaría de Gestión Integral de Riesgos y Protección Civil de la Ciudad de México. En InundaCDMX puedes marcar en el mapa un punto inundado para avisar a otras personas; los reportes se borran automáticamente a las 4 horas.</p>

<h2>Alcaldías cercanas</h2>
<ul class="links">
${near.map((n) => `<li><a href="${boroughUrl(n)}">Inundaciones en ${esc(n.name)}</a> (${n.floodZones} zonas)</li>`).join("\n")}
<li><a href="/inundaciones/">Todas las alcaldías</a></li>
</ul>
`;

  return layout({
    title,
    description,
    urlPath: boroughUrl(b),
    body,
    breadcrumbs: [
      { name: "Inicio", path: "/" },
      { name: "Inundaciones por alcaldía", path: "/inundaciones/" },
      { name: b.name, path: boroughUrl(b) },
    ],
  });
}

function indexPage() {
  const rows = [...boroughs]
    .sort((a, b) => a.rankByZones - b.rankByZones)
    .map(
      (b) =>
        `<tr><td><a href="${boroughUrl(b)}">${esc(b.name)}</a></td><td class="num">${b.floodZones}</td><td class="num">${number(b.floodSharePct)}%</td></tr>`,
    )
    .join("\n");

  const body = `
<nav aria-label="Ruta"><a href="/">Inicio</a> › Inundaciones por alcaldía</nav>
<h1>Inundaciones por alcaldía en la Ciudad de México</h1>
<p class="lead">Zonas con historial de encharcamiento en las 16 alcaldías, según datos abiertos de la Ciudad de México. Elige una alcaldía para ver su resumen y abrir el mapa.</p>

<a class="cta" href="/">Abrir el mapa de inundaciones en vivo</a>

<h2>Zonas con historial de encharcamiento</h2>
<table>
<thead><tr><th>Alcaldía</th><th class="num">Zonas</th><th class="num">% del territorio</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
<p class="note">Ordenadas por número de zonas registradas (${totalZones} dentro de los límites de las alcaldías). El porcentaje es la superficie aproximada de esas zonas respecto al territorio de cada alcaldía. Es un registro histórico, no una predicción.</p>

<h2>Cómo usar el mapa</h2>
<p>InundaCDMX combina tres capas: lluvia estimada por alcaldía en tiempo casi real, zonas con historial de encharcamiento y reportes ciudadanos de puntos inundados. Si hay riesgo inmediato, llama al 911.</p>
`;

  return layout({
    title: "Inundaciones por alcaldía en la Ciudad de México | InundaCDMX",
    description:
      "Zonas con historial de encharcamiento en las 16 alcaldías de la Ciudad de México. Consulta el resumen de cada alcaldía y abre el mapa con lluvia estimada.",
    urlPath: "/inundaciones/",
    body,
    breadcrumbs: [
      { name: "Inicio", path: "/" },
      { name: "Inundaciones por alcaldía", path: "/inundaciones/" },
    ],
  });
}

async function writePage(urlPath, html) {
  const file = path.join(DIST, urlPath, "index.html");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html);
}

await writePage("/inundaciones/", indexPage());
for (const b of boroughs) await writePage(boroughUrl(b), boroughPage(b));

const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: "/", priority: "1.0", changefreq: "daily" },
  { loc: "/inundaciones/", priority: "0.8", changefreq: "monthly" },
  ...boroughs.map((b) => ({ loc: boroughUrl(b), priority: "0.7", changefreq: "monthly" })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url>\n    <loc>${SITE}${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
  )
  .join("\n")}
</urlset>
`;
await writeFile(path.join(DIST, "sitemap.xml"), sitemap);

console.log(`Generated ${boroughs.length + 1} pages and a sitemap with ${urls.length} URLs.`);

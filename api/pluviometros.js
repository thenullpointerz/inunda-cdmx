export default async function handler(req, res) {
  const upstream = await fetch(
    "https://data.sacmex.cdmx.gob.mx/pluviometros/index.php/lluvia/get_pluviometros",
  );
  const data = await upstream.json();

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=60");
  res.status(200).json(data);
}

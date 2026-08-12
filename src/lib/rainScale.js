// Official SACMEX rain scale (mm accumulated), matching their public map:
// https://data.sacmex.cdmx.gob.mx/pluviometros/index.php/lluvia/mapa
export const RAIN_LEVELS = [
  { max: 0, label: "Sin lluvia", color: "#9b9a92" },
  { max: 3.0, label: "Ligera", color: "#2f9e44" },
  { max: 7.0, label: "Regular", color: "#e0b400" },
  { max: 13.0, label: "Fuerte", color: "#e8590c" },
  { max: 20.0, label: "Intensa", color: "#c92a2a" },
  { max: Infinity, label: "Torrencial", color: "#862e9c" },
];

export function rainLevelFor(mm) {
  return RAIN_LEVELS.find((level) => mm <= level.max);
}

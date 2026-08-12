import { useEffect, useState } from "react";

export function useRainGrid() {
  const [stations, setStations] = useState([]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/pluviometros")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setStations(
          data.map((s) => ({
            id: s.id_pluviometro,
            name: s.nombre,
            municipality: s.municipality,
            lat: Number(s.latitud),
            lon: Number(s.longitud),
            mm: Number(s.acumulado_actual),
            updatedAt: s.ultimaActualizacion,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setStations([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return stations;
}

import { useEffect, useState } from "react";

const REFRESH_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12 * 1000;

export function useRainGrid() {
  const [state, setState] = useState({ stations: [], status: "loading", source: null });

  useEffect(() => {
    let cancelled = false;

    function load() {
      fetch("/api/pluviometros", { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
        .then((res) => {
          if (!res.ok) throw new Error(`status ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (cancelled) return;
          setState({
            stations: data.stations.map((s) => ({
              id: s.id,
              name: s.name,
              municipality: s.municipality,
              lat: Number(s.lat),
              lon: Number(s.lon),
              mm: Number(s.mm),
              updatedAt: s.updatedAt,
            })),
            status: "ok",
            source: data.source,
          });
        })
        .catch(() => {
          if (cancelled) return;
          // Keep the last good readings on a failed refresh; only flag an error
          // when there is nothing to show.
          setState((prev) =>
            prev.stations.length > 0 ? prev : { stations: [], status: "error", source: null },
          );
        });
    }

    load();
    const interval = setInterval(load, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return state;
}

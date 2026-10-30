import { useEffect, useMemo, useState } from "react";
import {
  Droplet,
  Info,
  X,
  CloudRain,
  MapPinPlus,
  ChevronDown,
  ChevronUp,
  LocateFixed,
  Square,
  SquareCheck,
} from "lucide-react";
import FloodMap from "./components/FloodMap";
import boroughs from "./data/boroughs.json";
import { useRainGrid } from "./hooks/useRainGrid";
import { useReports } from "./hooks/useReports";
import { RAIN_LEVELS, rainLevelFor } from "./lib/rainScale";
import "./App.css";

const LAYERS = [
  { id: "rain", label: "Lluvia en vivo" },
  { id: "risk", label: "Riesgo historico" },
  { id: "reports", label: "Reportes" },
];

const EARTH_RADIUS_KM = 6371;

function distanceKm(station, point) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(station.lat - point.lat);
  const dLon = toRad(station.lon - point.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(point.lat)) * Math.cos(toRad(station.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function sortedByDistance(stations, point) {
  return stations
    .map((s) => ({ ...s, distanceKm: distanceKm(s, point) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

// Static borough pages link here as /?alcaldia=<slug>.
function boroughFromUrl() {
  const slug = new URLSearchParams(window.location.search).get("alcaldia");
  return boroughs.find((b) => b.slug === slug) ?? null;
}

function App() {
  const [initialBorough] = useState(boroughFromUrl);
  const [activeLayers, setActiveLayers] = useState({
    rain: true,
    risk: Boolean(initialBorough),
    reports: true,
  });
  const [focusBounds] = useState(initialBorough?.bounds ?? null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [reportMode, setReportMode] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [center, setCenter] = useState({ lat: 19.4326, lng: -99.1332 });
  const [userLocation, setUserLocation] = useState(null);
  const [focusTarget, setFocusTarget] = useState(null);
  const [reportFeedback, setReportFeedback] = useState(null);
  const { stations: rainPoints, status: rainStatus, source: rainSource } = useRainGrid();
  const { reports, allReports, addReport, available: reportsAvailable } = useReports();

  function locateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(loc);
        setCenter(loc);
      },
      () => {},
      { timeout: 8000 },
    );
  }

  useEffect(() => {
    // A borough link already chose where to look; don't fly away to the user.
    if (!initialBorough) locateMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function focusStation(station) {
    setFocusTarget({ lat: station.lat, lng: station.lon });
    setNearbyOpen(false);
  }

  // Rank by the user's own location when known; otherwise by the map center,
  // and say so in the card title so the list never changes silently.
  const reference = userLocation ?? center;
  const nearby = useMemo(() => sortedByDistance(rainPoints, reference), [rainPoints, reference]);
  const closest = nearby[0] ?? null;
  const wetCount = useMemo(() => rainPoints.filter((s) => s.mm > 0).length, [rainPoints]);

  async function handleMapClick(lat, lng) {
    const result = await addReport(lat, lng);
    setReportMode(false);

    if (!result.ok) {
      const messages = {
        out_of_bounds: "Ese punto esta fuera de CDMX, no se guardo.",
        cooldown: `Ya reportaste hace poco. Puedes reportar de nuevo en ${result.remainingMinutes} min.`,
        error: "No se pudo guardar el reporte, intenta de nuevo.",
        unavailable: "Los reportes no estan disponibles por ahora.",
      };
      setReportFeedback(messages[result.reason] ?? "No se pudo guardar el reporte.");
      setTimeout(() => setReportFeedback(null), 4000);
    }
  }

  function toggleLayer(id) {
    setActiveLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleReportMode() {
    setReportMode((v) => {
      const next = !v;
      if (next) setActiveLayers((prev) => ({ ...prev, reports: true }));
      return next;
    });
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="brand">
          <Droplet size={20} className="brand-icon" aria-hidden="true" />
          <span>InundaCDMX</span>{" "}
          <span className="brand-sub">Mapa de inundaciones y lluvia en vivo en la Ciudad de México</span>
        </h1>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setAboutOpen(true)}
          aria-label="Acerca de InundaCDMX"
          aria-expanded={aboutOpen}
          aria-controls="about"
        >
          <Info size={18} aria-hidden="true" />
        </button>
      </header>

      <div className="layers" role="group" aria-label="Capas del mapa">
        <span className="layers-label">Capas del mapa</span>
        {LAYERS.map((layer) => {
          const on = activeLayers[layer.id];
          const Icon = on ? SquareCheck : Square;
          return (
            <button
              key={layer.id}
              className={`layer ${on ? "layer-on" : ""}`}
              onClick={() => toggleLayer(layer.id)}
              type="button"
              aria-pressed={on}
              title={on ? `Ocultar ${layer.label.toLowerCase()}` : `Mostrar ${layer.label.toLowerCase()}`}
            >
              <Icon size={14} aria-hidden="true" />
              {layer.label}
            </button>
          );
        })}
      </div>

      <div className="map-wrap">
        <FloodMap
          showRisk={activeLayers.risk}
          showReports={activeLayers.reports}
          showRain={activeLayers.rain}
          rainPoints={rainPoints}
          reports={reports}
          historicalReports={allReports}
          reportMode={reportMode}
          userLocation={userLocation}
          focusTarget={focusTarget}
          focusBounds={focusBounds}
          onStationClick={focusStation}
          onMapClick={handleMapClick}
          onCenterChange={(lat, lng) => setCenter({ lat, lng })}
        />
        {reportMode && (
          <div className="report-hint">Toca el mapa para marcar la inundacion</div>
        )}
        {reportFeedback && <div className="report-hint report-hint-warning">{reportFeedback}</div>}

        <button
          type="button"
          className="locate-btn"
          onClick={locateMe}
          aria-label="Ir a mi ubicacion"
        >
          <LocateFixed size={18} aria-hidden="true" />
        </button>

        <div className="overlay-bottom">
          {activeLayers.risk && (
            <div className="legend">
              <span><i className="dot dot-red" /> Zona con historial de encharcamiento (IPDP)</span>
              <span><i className="dot" style={{ background: "#d4537e" }} /> Reportado por usuarios</span>
            </div>
          )}
          {activeLayers.rain && (
            <div className="legend">
              {rainStatus === "error" ? (
                <span className="legend-count">Datos de lluvia no disponibles por ahora</span>
              ) : (
                <>
                  <span className="legend-count">
                    {rainStatus === "loading"
                      ? "Consultando lluvia..."
                      : `${wetCount} de ${rainPoints.length} alcaldias con lluvia`}
                  </span>
                  {RAIN_LEVELS.filter((level) => level.label !== "Sin lluvia").map((level) => (
                    <span key={level.label}>
                      <i className="dot" style={{ background: level.color }} /> {level.label}
                    </span>
                  ))}
                  {rainSource && (
                    <span className="legend-note">Estimacion por modelo ({rainSource}), mm/h</span>
                  )}
                </>
              )}
            </div>
          )}

          <div className="overlay-row">
            <div className="rain-card">
              <button
                type="button"
                className="rain-card-header"
                onClick={() => setNearbyOpen((v) => !v)}
                disabled={nearby.length === 0}
              >
                <div className="rain-card-left">
                  <CloudRain size={18} className="brand-icon" aria-hidden="true" />
                  <div>
                    <p className="rain-title">
                      {userLocation ? "Lluvia en tu zona" : "Lluvia en esta zona del mapa"}
                    </p>
                    <p className="rain-subtitle">
                      {!closest && rainStatus === "loading" && "Consultando..."}
                      {!closest && rainStatus === "error" && "Datos no disponibles por ahora"}
                      {closest &&
                        `${closest.name}: ${rainLevelFor(closest.mm).label}, ${closest.mm} mm/h`}
                    </p>
                  </div>
                </div>
                {nearbyOpen ? (
                  <ChevronUp size={16} className="muted-icon" aria-hidden="true" />
                ) : (
                  <ChevronDown size={16} className="muted-icon" aria-hidden="true" />
                )}
              </button>

              {nearbyOpen && (
                <ul className="nearby-list">
                  {nearby.slice(0, 5).map((s) => (
                    <li key={s.id}>
                      <button type="button" className="nearby-item" onClick={() => focusStation(s)}>
                        <span>
                          {s.name} <span className="nearby-distance">a {s.distanceKm.toFixed(1)} km</span>
                        </span>
                        <span className={s.mm > 0 ? "nearby-wet" : "nearby-dry"}>
                          {s.mm > 0 ? `${rainLevelFor(s.mm).label} (${s.mm} mm/h)` : "Sin lluvia"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="button"
              className={`report-btn ${reportMode ? "report-btn-active" : ""}`}
              onClick={toggleReportMode}
              disabled={!reportsAvailable}
            >
              <MapPinPlus size={16} aria-hidden="true" />
              {!reportsAvailable
                ? "Reportes no disponibles"
                : reportMode
                  ? "Cancelar"
                  : "Reportar inundacion"}
            </button>
          </div>
        </div>
      </div>

      {/* Always in the DOM (hidden with CSS) so the text and links stay crawlable. */}
      <aside id="about" className={`about ${aboutOpen ? "about-open" : ""}`} inert={!aboutOpen}>
        <div className="about-inner">
          <div className="about-head">
            <h2>Acerca de InundaCDMX</h2>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setAboutOpen(false)}
              aria-label="Cerrar"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <p>
            InundaCDMX es un mapa de inundaciones en la Ciudad de México. Reúne en un solo lugar la
            lluvia estimada por alcaldía, las zonas con historial de encharcamiento y los reportes de
            personas que marcan puntos inundados.
          </p>

          <h3>Preguntas frecuentes</h3>
          <details>
            <summary>¿De dónde salen los datos de lluvia?</summary>
            <p>
              De Open-Meteo, un servicio de pronóstico meteorológico. Se estima la lluvia en milímetros
              por hora para cada una de las 16 alcaldías y se actualiza cada pocos minutos. Son
              estimaciones de un modelo, no lecturas de pluviómetros oficiales.
            </p>
          </details>
          <details>
            <summary>¿Qué son las zonas con historial de encharcamiento?</summary>
            <p>
              Son polígonos de los datos abiertos de la Ciudad de México donde se han registrado
              encharcamientos. Muestran dónde ha pasado antes, no predicen dónde pasará hoy.
            </p>
          </details>
          <details>
            <summary>¿Cómo reporto una inundación?</summary>
            <p>
              Pulsa «Reportar inundacion» y toca el punto en el mapa. Puedes enviar un reporte cada 10
              minutos y se borra automáticamente a las 4 horas.
            </p>
          </details>
          <details>
            <summary>¿Qué hago si hay una inundación?</summary>
            <p>
              Si hay riesgo inmediato, llama al 911. Para avisos oficiales, consulta a la Secretaría de
              Gestión Integral de Riesgos y Protección Civil de la Ciudad de México.
            </p>
          </details>

          <h3>Inundaciones por alcaldía</h3>
          <ul className="about-links">
            {boroughs.map((b) => (
              <li key={b.slug}>
                <a href={`/inundaciones/${b.slug}/`}>Inundaciones en {b.name}</a>
              </li>
            ))}
          </ul>
          <p>
            <a href="/inundaciones/">Ver todas las alcaldías</a>
          </p>
        </div>
      </aside>
    </div>
  );
}

export default App;

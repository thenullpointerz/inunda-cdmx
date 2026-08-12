import { useEffect, useMemo, useState } from "react";
import { Droplet, Bell, CloudRain, MapPinPlus, ChevronDown, ChevronUp, LocateFixed } from "lucide-react";
import FloodMap from "./components/FloodMap";
import { useRainGrid } from "./hooks/useRainGrid";
import { useReports } from "./hooks/useReports";
import { RAIN_LEVELS, rainLevelFor } from "./lib/rainScale";
import "./App.css";

const LAYERS = [
  { id: "rain", label: "Lluvia en vivo" },
  { id: "risk", label: "Riesgo historico" },
  { id: "reports", label: "Reportes" },
];

function sortedByDistance(stations, point) {
  return [...stations].sort((a, b) => {
    const da = (a.lat - point.lat) ** 2 + (a.lon - point.lng) ** 2;
    const db = (b.lat - point.lat) ** 2 + (b.lon - point.lng) ** 2;
    return da - db;
  });
}

function App() {
  const [activeLayers, setActiveLayers] = useState({ rain: true, risk: false, reports: true });
  const [reportMode, setReportMode] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [center, setCenter] = useState({ lat: 19.4326, lng: -99.1332 });
  const [userLocation, setUserLocation] = useState(null);
  const [focusTarget, setFocusTarget] = useState(null);
  const rainPoints = useRainGrid();
  const { reports, allReports, addReport } = useReports();

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
    locateMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function focusStation(station) {
    setFocusTarget({ lat: station.lat, lng: station.lon });
    setNearbyOpen(false);
  }

  const nearby = useMemo(() => sortedByDistance(rainPoints, center), [rainPoints, center]);
  const closest = nearby[0] ?? null;
  const wetCount = useMemo(() => rainPoints.filter((s) => s.mm > 0).length, [rainPoints]);

  function handleMapClick(lat, lng) {
    addReport(lat, lng);
    setReportMode(false);
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
        <div className="brand">
          <Droplet size={20} className="brand-icon" aria-hidden="true" />
          <span>InundaCDMX</span>
        </div>
        <Bell size={18} className="muted-icon" aria-hidden="true" />
      </header>

      <nav className="tabs">
        {LAYERS.map((layer) => (
          <button
            key={layer.id}
            className={`tab ${activeLayers[layer.id] ? "tab-active" : ""}`}
            onClick={() => toggleLayer(layer.id)}
            type="button"
          >
            {layer.label}
          </button>
        ))}
      </nav>

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
          onMapClick={handleMapClick}
          onCenterChange={(lat, lng) => setCenter({ lat, lng })}
        />
        {reportMode && (
          <div className="report-hint">Toca el mapa para marcar la inundacion</div>
        )}

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
              <span className="legend-count">
                {wetCount} de {rainPoints.length} estaciones con lluvia
              </span>
              {RAIN_LEVELS.filter((level) => level.label !== "Sin lluvia").map((level) => (
                <span key={level.label}>
                  <i className="dot" style={{ background: level.color }} /> {level.label}
                </span>
              ))}
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
                    <p className="rain-title">Lluvia en tu zona</p>
                    <p className="rain-subtitle">
                      {!closest && "Consultando..."}
                      {closest &&
                        `${closest.name}: ${rainLevelFor(closest.mm).label}, ${closest.mm} mm`}
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
                        <span>{s.name}</span>
                        <span className={s.mm > 0 ? "nearby-wet" : "nearby-dry"}>
                          {s.mm > 0 ? `${rainLevelFor(s.mm).label} (${s.mm} mm)` : "Sin lluvia"}
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
            >
              <MapPinPlus size={16} aria-hidden="true" />
              {reportMode ? "Cancelar" : "Reportar inundacion"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

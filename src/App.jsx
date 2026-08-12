import { useMemo, useState } from "react";
import { Droplet, Bell, CloudRain, MapPinPlus, ChevronDown } from "lucide-react";
import FloodMap from "./components/FloodMap";
import { useRainGrid } from "./hooks/useRainGrid";
import { useReports } from "./hooks/useReports";
import { RAIN_LEVELS, rainLevelFor } from "./lib/rainScale";
import "./App.css";

const TABS = [
  { id: "rain", label: "Lluvia en vivo" },
  { id: "risk", label: "Riesgo historico" },
  { id: "reports", label: "Reportes" },
];

function nearestStation(stations, center) {
  if (stations.length === 0) return null;
  return stations.reduce((closest, s) => {
    const d = (s.lat - center.lat) ** 2 + (s.lon - center.lng) ** 2;
    const dClosest = (closest.lat - center.lat) ** 2 + (closest.lon - center.lng) ** 2;
    return d < dClosest ? s : closest;
  });
}

function App() {
  const [activeTab, setActiveTab] = useState("rain");
  const [reportMode, setReportMode] = useState(false);
  const [center, setCenter] = useState({ lat: 19.4326, lng: -99.1332 });
  const rainPoints = useRainGrid();
  const { reports, addReport } = useReports();

  const closest = useMemo(() => nearestStation(rainPoints, center), [rainPoints, center]);

  function handleMapClick(lat, lng) {
    addReport(lat, lng);
    setReportMode(false);
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
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "tab-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="map-wrap">
        <FloodMap
          showRisk={activeTab === "risk"}
          showReports={activeTab === "reports"}
          showRain={activeTab === "rain"}
          rainPoints={rainPoints}
          reports={reports}
          reportMode={reportMode}
          onMapClick={handleMapClick}
          onCenterChange={(lat, lng) => setCenter({ lat, lng })}
        />
        {reportMode && (
          <div className="report-hint">Toca el mapa para marcar la inundacion</div>
        )}

        <div className="overlay-bottom">
          {activeTab === "risk" && (
            <div className="legend">
              <span><i className="dot dot-red" /> Zona con historial de encharcamiento</span>
            </div>
          )}
          {activeTab === "rain" && (
            <div className="legend">
              {RAIN_LEVELS.filter((level) => level.label !== "Sin lluvia").map((level) => (
                <span key={level.label}>
                  <i className="dot" style={{ background: level.color }} /> {level.label}
                </span>
              ))}
            </div>
          )}

          <div className="overlay-row">
            <div className="rain-card">
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
              <ChevronDown size={16} className="muted-icon" aria-hidden="true" />
            </div>

            <button
              type="button"
              className={`report-btn ${reportMode ? "report-btn-active" : ""}`}
              onClick={() => setReportMode((v) => !v)}
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

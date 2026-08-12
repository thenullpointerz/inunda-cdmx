import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  CircleMarker,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import encharcamientos from "../data/encharcamientos.json";
import { REPORT_TTL_MS } from "../hooks/useReports";
import { rainLevelFor } from "../lib/rainScale";

const CDMX_CENTER = [19.4326, -99.1332];

const riskStyle = {
  color: "#993c1d",
  weight: 1,
  fillColor: "#d85a30",
  fillOpacity: 0.35,
};

function rainStyle(mm) {
  const { color } = rainLevelFor(mm);
  const radius = mm <= 0 ? 5 : 12 + Math.min(mm, 20) * 0.9;
  const fillOpacity = mm <= 0 ? 0.4 : 0.5;
  return { radius, color, fillOpacity };
}

function reportAge(createdAt) {
  const minutesAgo = Math.floor((Date.now() - createdAt) / 60000);
  const hoursLeft = Math.max(0, (createdAt + REPORT_TTL_MS - Date.now()) / 3600000);
  const ago = minutesAgo < 60 ? `hace ${minutesAgo} min` : `hace ${Math.floor(minutesAgo / 60)} h`;
  return `${ago} · se borra en ${hoursLeft.toFixed(1)} h`;
}

function reportIcon() {
  return L.divIcon({
    className: "report-pin",
    html: '<span class="report-pin-dot"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function MapEvents({ onMapClick, onCenterChange, reportMode }) {
  const map = useMapEvents({
    click(e) {
      if (reportMode) onMapClick(e.latlng.lat, e.latlng.lng);
    },
    moveend() {
      const c = map.getCenter();
      onCenterChange(c.lat, c.lng);
    },
  });
  return null;
}

export default function FloodMap({
  showRisk,
  showReports,
  showRain,
  rainPoints,
  reports,
  reportMode,
  onMapClick,
  onCenterChange,
}) {
  useEffect(() => {
    onCenterChange(CDMX_CENTER[0], CDMX_CENTER[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MapContainer
      center={CDMX_CENTER}
      zoom={11}
      scrollWheelZoom
      style={{ height: "100%", width: "100%", cursor: reportMode ? "crosshair" : "" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {showRisk && <GeoJSON data={encharcamientos} style={riskStyle} />}
      {showRain &&
        rainPoints.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lon]}
            radius={rainStyle(p.mm).radius}
            pathOptions={{
              color: rainStyle(p.mm).color,
              fillColor: rainStyle(p.mm).color,
              fillOpacity: rainStyle(p.mm).fillOpacity,
              weight: 1,
            }}
          >
            <Tooltip direction="top">
              {p.name}: {p.mm > 0 ? `${rainLevelFor(p.mm).label} (${p.mm} mm)` : "sin lluvia"}
            </Tooltip>
          </CircleMarker>
        ))}
      {showReports &&
        reports.map((r) => (
          <Marker key={r.id} position={[r.lat, r.lng]} icon={reportIcon()}>
            <Tooltip direction="top">{reportAge(r.createdAt)}</Tooltip>
          </Marker>
        ))}
      <MapEvents
        onMapClick={onMapClick}
        onCenterChange={onCenterChange}
        reportMode={reportMode}
      />
    </MapContainer>
  );
}

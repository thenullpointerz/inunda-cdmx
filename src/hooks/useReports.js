import { useEffect, useState } from "react";

const STORAGE_KEY = "inunda-cdmx-reports";
export const REPORT_TTL_MS = 4 * 60 * 60 * 1000;

function loadReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return parsed.filter((r) => Date.now() - r.createdAt < REPORT_TTL_MS);
  } catch {
    return [];
  }
}

export function useReports() {
  const [reports, setReports] = useState(loadReports);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    const interval = setInterval(() => {
      setReports((prev) => prev.filter((r) => Date.now() - r.createdAt < REPORT_TTL_MS));
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  function addReport(lat, lng) {
    setReports((prev) => [
      ...prev,
      { id: crypto.randomUUID(), lat, lng, createdAt: Date.now() },
    ]);
  }

  return { reports, addReport };
}

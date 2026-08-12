import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const STORAGE_KEY = "inunda-cdmx-reports";
const COOLDOWN_KEY = "inunda-cdmx-last-report";
const COOLDOWN_MS = 10 * 60 * 1000;
export const REPORT_TTL_MS = 4 * 60 * 60 * 1000;

const CDMX_BOUNDS = { minLat: 19.0, maxLat: 19.65, minLng: -99.4, maxLng: -98.9 };

function withinCdmx(lat, lng) {
  return (
    lat >= CDMX_BOUNDS.minLat &&
    lat <= CDMX_BOUNDS.maxLat &&
    lng >= CDMX_BOUNDS.minLng &&
    lng <= CDMX_BOUNDS.maxLng
  );
}

function cooldownRemainingMs() {
  const last = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
  return Math.max(0, COOLDOWN_MS - (Date.now() - last));
}

function loadLocalReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return parsed.filter((r) => Date.now() - r.createdAt < REPORT_TTL_MS);
  } catch {
    return [];
  }
}

function mapRow(row) {
  return { id: row.id, lat: row.lat, lng: row.lng, createdAt: new Date(row.created_at).getTime() };
}

function addUnique(prev, row) {
  if (prev.some((r) => r.id === row.id)) return prev;
  return [row, ...prev];
}

export function useReports() {
  const [allReports, setAllReports] = useState(supabase ? [] : loadLocalReports);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setAllReports(data.map(mapRow));
      });

    const channel = supabase
      .channel("reports-inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reports" },
        (payload) => setAllReports((prev) => addUnique(prev, mapRow(payload.new))),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!supabase) localStorage.setItem(STORAGE_KEY, JSON.stringify(allReports));
  }, [allReports]);

  async function addReport(lat, lng) {
    if (!withinCdmx(lat, lng)) {
      return { ok: false, reason: "out_of_bounds" };
    }

    const remaining = cooldownRemainingMs();
    if (remaining > 0) {
      return { ok: false, reason: "cooldown", remainingMinutes: Math.ceil(remaining / 60000) };
    }

    if (supabase) {
      const { data, error } = await supabase.from("reports").insert({ lat, lng }).select().single();
      if (error || !data) return { ok: false, reason: "error" };
      setAllReports((prev) => addUnique(prev, mapRow(data)));
    } else {
      setAllReports((prev) => [{ id: crypto.randomUUID(), lat, lng, createdAt: Date.now() }, ...prev]);
    }

    localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
    return { ok: true };
  }

  const reports = allReports.filter((r) => Date.now() - r.createdAt < REPORT_TTL_MS);

  return { reports, allReports, addReport };
}

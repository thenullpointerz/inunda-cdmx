import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const STORAGE_KEY = "inunda-cdmx-reports";
export const REPORT_TTL_MS = 4 * 60 * 60 * 1000;

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
    if (supabase) {
      const { data, error } = await supabase.from("reports").insert({ lat, lng }).select().single();
      if (!error && data) setAllReports((prev) => addUnique(prev, mapRow(data)));
      return;
    }
    setAllReports((prev) => [{ id: crypto.randomUUID(), lat, lng, createdAt: Date.now() }, ...prev]);
  }

  const reports = allReports.filter((r) => Date.now() - r.createdAt < REPORT_TTL_MS);

  return { reports, allReports, addReport };
}

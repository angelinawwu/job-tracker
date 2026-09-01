"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Application } from "./types";

const STORAGE_KEY = "internship-tracker:applications";
const SAVE_DEBOUNCE_MS = 800;

export type SyncState = "loading" | "local" | "synced" | "saving" | "error";

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [syncState, setSyncState] = useState<SyncState>("loading");
  const configuredRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadLocal();
      try {
        const res = await fetch("/api/applications");
        const data = await res.json();
        if (cancelled) return;
        configuredRef.current = Boolean(data.configured);
        if (data.configured && !data.error) {
          const remote: Application[] = data.applications ?? [];
          setApplications(remote.length > 0 ? remote : local);
          setSyncState("synced");
        } else {
          setApplications(local);
          setSyncState(data.error ? "error" : "local");
        }
      } catch {
        if (cancelled) return;
        setApplications(local);
        setSyncState("local");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((apps: Application[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
    if (!configuredRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSyncState("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/applications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applications: apps }),
        });
        setSyncState(res.ok ? "synced" : "error");
      } catch {
        setSyncState("error");
      }
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const update = useCallback(
    (updater: (prev: Application[]) => Application[]) => {
      setApplications((prev) => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  return { applications, update, syncState };
}

function loadLocal(): Application[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Application[]) : [];
  } catch {
    return [];
  }
}

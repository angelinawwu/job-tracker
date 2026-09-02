"use client";

import { useMemo, useRef } from "react";
import { DEFAULT_TAGS } from "@/lib/tags";
import { newApplication, type Application } from "@/lib/types";
import { useApplications, type SyncState } from "@/lib/useApplications";
import DateCell from "./cells/DateCell";
import LinkCell from "./cells/LinkCell";
import MaterialsCell from "./cells/MaterialsCell";
import NotesCell from "./cells/NotesCell";
import ReferralCell from "./cells/ReferralCell";
import StatusCell from "./cells/StatusCell";
import TextCell from "./cells/TextCell";

const GRID =
  "grid grid-cols-[108px_64px_minmax(120px,1fr)_minmax(150px,1.2fr)_minmax(160px,1.3fr)_minmax(130px,1fr)_minmax(140px,1.2fr)_36px]";

function SyncBadge({ state }: { state: SyncState }) {
  const config: Record<SyncState, { label: string; className: string }> = {
    loading: { label: "Loading…", className: "text-faint" },
    local: { label: "Local only — connect Google Sheets in .env.local", className: "text-faint" },
    synced: { label: "Synced to Google Sheets", className: "text-green-700" },
    saving: { label: "Saving…", className: "text-faint" },
    error: { label: "Sync error — data kept locally", className: "text-red-600" },
  };
  const { label, className } = config[state];
  return <span className={`text-[12px] transition-colors ${className}`}>{label}</span>;
}

export default function TrackerTable() {
  const { applications, update, syncState } = useApplications();
  const lastAddedId = useRef<string | null>(null);

  const allTags = useMemo(() => {
    const custom = new Set<string>();
    applications.forEach((a) =>
      a.materials.forEach((m) => {
        if (!(m in DEFAULT_TAGS)) custom.add(m);
      })
    );
    return Array.from(custom);
  }, [applications]);

  const patchRow = (id: string, patch: Partial<Application>) => {
    update((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const addRow = () => {
    const app = newApplication();
    lastAddedId.current = app.id;
    update((prev) => [...prev, app]);
  };

  const deleteRow = (id: string) => {
    update((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div>
      <header className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">
            Internship Tracker
          </h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {applications.length} application{applications.length === 1 ? "" : "s"}
          </p>
        </div>
        <SyncBadge state={syncState} />
      </header>

      <div className="overflow-x-auto rounded-lg border border-line">
        <div className="min-w-[900px]">
          {/* Header row */}
          <div className={`${GRID} border-b border-line bg-hoverbg text-[12px] font-medium text-muted`}>
            <span className="px-2 py-1.5">Date applied</span>
            <span className="flex items-center justify-center py-1.5" title="Job posting link">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6.5 9.5l3-3M7.25 4.75l1.1-1.1a2.62 2.62 0 013.7 3.7l-1.1 1.1M8.75 11.25l-1.1 1.1a2.62 2.62 0 01-3.7-3.7l1.1-1.1"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="border-l border-line px-2 py-1.5">Company</span>
            <span className="border-l border-line px-2 py-1.5">Job title</span>
            <span className="border-l border-line px-2 py-1.5">Materials</span>
            <span className="border-l border-line px-2 py-1.5">Status</span>
            <span className="border-l border-line px-2 py-1.5">Notes</span>
            <span />
          </div>

          {/* Data rows */}
          {applications.map((app) => (
            <div
              key={app.id}
              className={`${GRID} group min-h-[34px] border-b border-line last:border-b-0 ${
                lastAddedId.current === app.id ? "row-enter" : ""
              }`}
            >
              <DateCell
                value={app.dateApplied}
                onChange={(dateApplied) => patchRow(app.id, { dateApplied })}
              />
              <div className="flex items-center justify-center gap-0.5">
                <ReferralCell
                  value={app.referral ?? ""}
                  onChange={(referral) => patchRow(app.id, { referral })}
                />
                <LinkCell
                  value={app.link}
                  onChange={(link) => patchRow(app.id, { link })}
                  onMetadata={({ company, jobTitle }) => {
                    update((prev) =>
                      prev.map((a) =>
                        a.id === app.id
                          ? {
                              ...a,
                              company: a.company || company,
                              jobTitle: a.jobTitle || jobTitle,
                            }
                          : a
                      )
                    );
                  }}
                />
              </div>
              <div className="border-l border-line">
                <TextCell
                  value={app.company}
                  onChange={(company) => patchRow(app.id, { company })}
                  placeholder="Company"
                  className="font-medium"
                />
              </div>
              <div className="border-l border-line">
                <TextCell
                  value={app.jobTitle}
                  onChange={(jobTitle) => patchRow(app.id, { jobTitle })}
                  placeholder="Job title"
                />
              </div>
              <div className="border-l border-line">
                <MaterialsCell
                  value={app.materials}
                  onChange={(materials) => patchRow(app.id, { materials })}
                  allTags={allTags}
                />
              </div>
              <div className="border-l border-line">
                <StatusCell
                  value={app.status}
                  onChange={(status) => patchRow(app.id, { status })}
                />
              </div>
              <div className="border-l border-line">
                <NotesCell
                  value={app.notes}
                  onChange={(notes) => patchRow(app.id, { notes })}
                />
              </div>
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => deleteRow(app.id)}
                  className="pressable grid h-6 w-6 place-items-center rounded-md text-faint opacity-0 transition-opacity hover:bg-hoverbg hover:text-red-500 group-hover:opacity-100"
                  aria-label="Delete row"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M2.5 3.5h9M5.5 3.5v-1a1 1 0 011-1h1a1 1 0 011 1v1M3.5 3.5l.5 8a1 1 0 001 1h4a1 1 0 001-1l.5-8"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {/* New row */}
          <button
            type="button"
            onClick={addRow}
            className="flex h-[34px] w-full items-center gap-1.5 px-2 text-[13px] text-faint transition-colors hover:bg-hoverbg hover:text-muted"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            New
          </button>
        </div>
      </div>
    </div>
  );
}

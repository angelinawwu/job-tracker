import { google } from "googleapis";
import { MAX_PHASES, type Application, type StatusPhase } from "./types";

/**
 * Google Sheets persistence layer.
 *
 * Setup (see .env.example):
 * 1. Create a Google Cloud project and enable the Google Sheets API.
 * 2. Create a service account and download its JSON key.
 * 3. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY from that key.
 * 4. Create a spreadsheet, share it with the service account email (Editor),
 *    and set GOOGLE_SHEETS_SPREADSHEET_ID to the id in the sheet URL.
 *
 * Until those env vars are set, the app runs in local-only mode and stores
 * data in the browser's localStorage.
 *
 * The sheet is treated as the source of truth for its own layout: the header
 * row is read to find which column holds which field, so the tab keeps its
 * human-friendly headers ("Company", "Position Title", "App Materials", ...)
 * and column order instead of being rewritten into the app's field names.
 *
 * Status history lives in "Phase 1" … "Phase 6" columns, one phase per cell,
 * oldest first. Each cell holds `Label (MM/DD/YYYY)` on its first line and the
 * phase's description on the lines after. "Status" keeps the current label so
 * the sheet stays scannable (and filterable) on its own.
 */

const SHEET_NAME = process.env.GOOGLE_SHEETS_TAB_NAME || "Applications";

type PhaseField = `phase${number}`;
const PHASE_FIELDS = Array.from(
  { length: MAX_PHASES },
  (_, i) => `phase${i + 1}` as PhaseField
);

/** Fields the app needs, and the header names each one may appear under. */
const COLUMN_ALIASES: Record<string, readonly string[]> = {
  company: ["company", "company name", "employer"],
  jobTitle: ["position title", "job title", "position", "role", "title"],
  dateApplied: ["date", "date applied", "applied"],
  link: ["link", "found on", "app method", "url", "posting", "job link"],
  referral: ["referral", "referred by", "referrer"],
  materials: ["app materials", "materials", "application materials"],
  status: ["status"],
  notes: ["notes", "contact", "note"],
  ...Object.fromEntries(
    PHASE_FIELDS.map((f, i) => [f, [`phase ${i + 1}`, `phase${i + 1}`, `stage ${i + 1}`]])
  ),
};

type CoreField =
  | "company"
  | "jobTitle"
  | "dateApplied"
  | "link"
  | "referral"
  | "materials"
  | "status"
  | "notes";
type Field = CoreField | PhaseField;

/**
 * Column order used when a tab has no recognisable header row. Phase columns
 * come after Notes so tabs laid out before they existed keep their positions.
 */
const CORE_ORDER: CoreField[] = [
  "company",
  "jobTitle",
  "dateApplied",
  "link",
  "referral",
  "materials",
  "status",
  "notes",
];
const DEFAULT_ORDER: Field[] = [...CORE_ORDER, ...PHASE_FIELDS];

/** Header text written for a field when the sheet has no column for it yet. */
const HEADER_LABELS: Record<Field, string> = {
  company: "Company",
  jobTitle: "Position Title",
  dateApplied: "Date",
  link: "Link",
  referral: "Referral",
  materials: "App Materials",
  status: "Status",
  notes: "Notes",
  ...Object.fromEntries(PHASE_FIELDS.map((f, i) => [f, `Phase ${i + 1}`])),
};

const DEFAULT_HEADER = DEFAULT_ORDER.map((f) => HEADER_LABELS[f]);

/** Sheets tops out at column Z for the range this module reads and writes. */
const MAX_COLUMNS = 26;

/** Sheets serial dates count from 1899-12-30. */
const SHEETS_EPOCH_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;

type Cell = string | number | boolean | null | undefined;

export function sheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
  );
}

/**
 * Hosting dashboards (Vercel, etc.) store env values verbatim, so a key pasted
 * from .env.local keeps its wrapping quotes and literal "\n" escapes, and one
 * pasted from the JSON key file may have real newlines. Normalise all of them.
 */
function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n").trim() + "\n";
}

/** Accepts either the bare id or a full sheet URL pasted by mistake. */
function spreadsheetIdValue(): string {
  const raw = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!.trim();
  return raw.match(/\/spreadsheets\/d\/([^/?#]+)/)?.[1] ?? raw;
}

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim(),
    key: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY!),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

/** Tab names can contain spaces and dashes, so they must be quoted in A1 notation. */
function range(a1: string): string {
  return `'${SHEET_NAME.replace(/'/g, "''")}'!${a1}`;
}

function normalizeHeader(value: Cell): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Maps each field to its column index, using the sheet's own header row. */
function resolveColumns(headerRow: Cell[]): Record<Field, number> {
  const normalized = headerRow.map(normalizeHeader);
  const columns = {} as Record<Field, number>;
  for (const field of DEFAULT_ORDER) {
    columns[field] = normalized.findIndex((h) => COLUMN_ALIASES[field].includes(h));
  }
  // Fall back to the documented order for any core field the header didn't
  // cover. Phase columns are never guessed: a tab that predates them gets them
  // appended on the next write instead, so nothing of the user's is overwritten.
  const unmatched = CORE_ORDER.filter((f) => columns[f] === -1);
  for (const field of unmatched) {
    const index = CORE_ORDER.indexOf(field);
    const taken = Object.values(columns).includes(index);
    columns[field] = taken ? -1 : index;
  }
  return columns;
}

function cellText(row: Cell[], index: number): string {
  if (index < 0) return "";
  return String(row[index] ?? "").trim();
}

function serialToISO(serial: number): string {
  return new Date(SHEETS_EPOCH_MS + serial * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

/**
 * Accepts what the Sheets API actually returns for a date column: a serial
 * number for real dates, or text like "08/11/26" / "2026-08-11" when the cell
 * was typed as a string.
 */
function parseDate(value: Cell): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return serialToISO(value);
  }
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (slash) {
    const [, month, day, year] = slash;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toISOString().slice(0, 10);
}

/** ISO date back to the MM/DD/YYYY the sheet's en_US date format expects. */
function isoToSheetDate(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${month}/${day}/${year}`;
}

function parseMaterials(value: string): string[] {
  return value
    .split(/[,/]|\band\b/gi)
    .map((m) => m.trim())
    .filter(Boolean);
}

/** `Label (MM/DD/YYYY)` on the first line, description on the rest. */
function encodePhase(phase: StatusPhase): string {
  const head = phase.date
    ? `${phase.label} (${isoToSheetDate(phase.date)})`
    : phase.label;
  const description = phase.description.trim();
  return description ? `${head}\n${description}` : head;
}

/**
 * Inverse of encodePhase, tolerant of hand-typed cells: a first line with no
 * parenthesised date (or one that isn't a date, like "Interview (Onsite)") is
 * taken whole as the label and dated to the application.
 */
function decodePhase(
  text: string,
  fallbackDate: string,
  id: string
): StatusPhase | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const [first, ...rest] = trimmed.split(/\r?\n/);
  const match = first.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  const date = match ? parseDate(match[2]) : "";
  const label = (date && match ? match[1] : first).trim();
  return {
    id,
    label: label || "Pending",
    description: rest.join("\n").trim(),
    date: date || fallbackDate,
  };
}

/**
 * Builds the ordered history from the Phase columns. Rows written before those
 * columns existed only have a Status label, so they get the legacy shape:
 * "Pending" first, then the label if it is anything else.
 *
 * A Status label edited by hand in the sheet that no longer matches the newest
 * phase is appended as a new phase, so edits made there aren't lost either.
 */
function parseStatus(
  row: Cell[],
  columns: Record<Field, number>,
  dateApplied: string,
  seed: string
): StatusPhase[] {
  const phases = PHASE_FIELDS.map((field, i) =>
    decodePhase(cellText(row, columns[field]), dateApplied, `${seed}-p${i}`)
  ).filter((p): p is StatusPhase => p !== null);

  if (phases.length === 0) {
    phases.push({ id: `${seed}-pending`, label: "Pending", description: "", date: dateApplied });
  }
  const current = cellText(row, columns.status);
  const newest = phases[phases.length - 1];
  if (
    current &&
    current.toLowerCase() !== newest.label.toLowerCase() &&
    phases.length < MAX_PHASES
  ) {
    phases.push({ id: `${seed}-current`, label: current, description: "", date: dateApplied });
  }
  return phases;
}

/**
 * The sheet has no id column, so ids are derived from row content. They stay
 * stable across reads (no row remounting in the UI) without adding a column
 * the user would see.
 */
function rowId(parts: string[], index: number): string {
  const key = parts.join("|");
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return `r${index}-${(hash >>> 0).toString(36)}`;
}

/** Stops a leading =, +, - or @ from being read as a formula on write. */
function escapeFormula(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function fromRow(
  row: Cell[],
  columns: Record<Field, number>,
  index: number
): Application | null {
  const company = cellText(row, columns.company);
  const jobTitle = cellText(row, columns.jobTitle);
  const link = cellText(row, columns.link);
  const referral = cellText(row, columns.referral);
  const notes = cellText(row, columns.notes);
  const dateApplied = parseDate(
    columns.dateApplied < 0 ? "" : row[columns.dateApplied]
  );
  // A row with nothing identifying in it is blank spacing, not an application.
  if (!company && !jobTitle && !link) return null;

  const id = rowId([company, jobTitle, dateApplied, link], index);
  return {
    id,
    dateApplied,
    link,
    company,
    jobTitle,
    referral,
    materials: parseMaterials(cellText(row, columns.materials)),
    status: parseStatus(row, columns, dateApplied, id),
    notes,
  };
}

function toRow(
  app: Application,
  columns: Record<Field, number>,
  width: number
): string[] {
  // Only the newest MAX_PHASES fit in the sheet; the oldest are the ones to lose.
  const phases = app.status.slice(-MAX_PHASES);
  const current = phases[phases.length - 1];
  const values: Record<Field, string> = {
    company: app.company,
    jobTitle: app.jobTitle,
    dateApplied: app.dateApplied ? isoToSheetDate(app.dateApplied) : "",
    link: app.link,
    referral: app.referral,
    materials: app.materials.join(", "),
    status: current?.label ?? "Pending",
    notes: app.notes,
    ...Object.fromEntries(
      PHASE_FIELDS.map((f, i) => [f, phases[i] ? encodePhase(phases[i]) : ""])
    ),
  };
  const row = new Array<string>(width).fill("");
  for (const field of DEFAULT_ORDER) {
    const index = columns[field];
    if (index >= 0 && index < width) {
      row[index] =
        field === "dateApplied" ? values[field] : escapeFormula(values[field]);
    }
  }
  return row;
}

async function readSheet() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetIdValue(),
    range: range("A1:Z"),
    // Dates come back as serial numbers rather than display text, so parsing
    // does not depend on how the column happens to be formatted.
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const rows = (res.data.values ?? []) as Cell[][];
  const headerRow = rows[0] ?? [];
  return { headerRow, dataRows: rows.slice(1) };
}

export async function readApplications(): Promise<Application[]> {
  const { headerRow, dataRows } = await readSheet();
  const columns = resolveColumns(headerRow);
  return dataRows
    .map((row, i) => fromRow(row, columns, i))
    .filter((a): a is Application => a !== null);
}

export async function writeApplications(apps: Application[]): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = spreadsheetIdValue();

  // Reuse the sheet's existing header so its wording and column order survive.
  const { headerRow } = await readSheet();
  const hasHeader = headerRow.some((c) => String(c ?? "").trim() !== "");
  const header = hasHeader ? headerRow.map((c) => String(c ?? "")) : [...DEFAULT_HEADER];
  const columns = resolveColumns(header);

  // A field the sheet has no column for would be silently dropped on write, so
  // give it one. This is how a tab created before a field existed (Referral,
  // say) gains that column the first time the app saves.
  for (const field of DEFAULT_ORDER) {
    if (columns[field] >= 0 || header.length >= MAX_COLUMNS) continue;
    columns[field] = header.length;
    header.push(HEADER_LABELS[field]);
  }

  const width = Math.min(Math.max(header.length, DEFAULT_ORDER.length), MAX_COLUMNS);
  const lastColumn = String.fromCharCode("A".charCodeAt(0) + width - 1);

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: range(`A2:${lastColumn}`),
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: range("A1"),
    // USER_ENTERED keeps the Date column as real dates instead of text.
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [header, ...apps.map((a) => toRow(a, columns, width))],
    },
  });
}

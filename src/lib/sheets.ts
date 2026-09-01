import { google } from "googleapis";
import type { Application, StatusPhase } from "./types";

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
 */

const SHEET_NAME = process.env.GOOGLE_SHEETS_TAB_NAME || "Applications";

/** Fields the app needs, and the header names each one may appear under. */
const COLUMN_ALIASES = {
  company: ["company", "company name", "employer"],
  jobTitle: ["position title", "job title", "position", "role", "title"],
  dateApplied: ["date", "date applied", "applied"],
  link: ["link", "found on", "app method", "url", "posting", "job link"],
  materials: ["app materials", "materials", "application materials"],
  status: ["status"],
  notes: ["notes", "contact", "note"],
} as const;

type Field = keyof typeof COLUMN_ALIASES;

/** Column order used when a tab has no recognisable header row. */
const DEFAULT_ORDER: Field[] = [
  "company",
  "jobTitle",
  "dateApplied",
  "link",
  "materials",
  "status",
  "notes",
];

const DEFAULT_HEADER = [
  "Company",
  "Position Title",
  "Date",
  "Link",
  "App Materials",
  "Status",
  "Notes",
];

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

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
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
  for (const field of Object.keys(COLUMN_ALIASES) as Field[]) {
    columns[field] = normalized.findIndex((h) =>
      (COLUMN_ALIASES[field] as readonly string[]).includes(h)
    );
  }
  // Fall back to the documented order for anything the header didn't cover.
  const unmatched = DEFAULT_ORDER.filter((f) => columns[f] === -1);
  for (const field of unmatched) {
    const index = DEFAULT_ORDER.indexOf(field);
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

/**
 * The sheet stores one current status label per row, while the app models an
 * ordered history. Every application starts as "Pending", so a label other
 * than that becomes a second phase on top of it.
 */
function parseStatus(label: string, dateApplied: string, seed: string): StatusPhase[] {
  const phases: StatusPhase[] = [
    { id: `${seed}-pending`, label: "Pending", description: "", date: dateApplied },
  ];
  const current = label.trim();
  if (current && current.toLowerCase() !== "pending") {
    phases.push({
      id: `${seed}-current`,
      label: current,
      description: "",
      date: dateApplied,
    });
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
    materials: parseMaterials(cellText(row, columns.materials)),
    status: parseStatus(cellText(row, columns.status), dateApplied, id),
    notes,
  };
}

function toRow(
  app: Application,
  columns: Record<Field, number>,
  width: number
): string[] {
  const current = app.status[app.status.length - 1];
  const values: Record<Field, string> = {
    company: app.company,
    jobTitle: app.jobTitle,
    dateApplied: app.dateApplied ? isoToSheetDate(app.dateApplied) : "",
    link: app.link,
    materials: app.materials.join(", "),
    status: current?.label ?? "Pending",
    notes: app.notes,
  };
  const row = new Array<string>(width).fill("");
  for (const field of Object.keys(values) as Field[]) {
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
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
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
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

  // Reuse the sheet's existing header so its wording and column order survive.
  const { headerRow } = await readSheet();
  const hasHeader = headerRow.some((c) => String(c ?? "").trim() !== "");
  const header = hasHeader ? headerRow.map((c) => String(c ?? "")) : DEFAULT_HEADER;
  const columns = resolveColumns(header);
  const width = Math.min(Math.max(header.length, DEFAULT_ORDER.length), 26);
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

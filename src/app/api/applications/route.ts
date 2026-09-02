import { NextResponse } from "next/server";
import {
  readApplications,
  sheetsConfigured,
  writeApplications,
} from "@/lib/sheets";
import type { Application } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Turn a googleapis error into something a human can act on. */
function describe(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/DECODER|PEM|private key|asn1|routines/i.test(msg))
    return "Private key is malformed — check GOOGLE_PRIVATE_KEY";
  if (/invalid_grant|invalid_client|unauthorized_client/i.test(msg))
    return "Service account credentials rejected — check email and private key";
  if (/permission|403|forbidden/i.test(msg))
    return "No access — share the sheet with the service account email";
  if (/not found|404/i.test(msg))
    return "Spreadsheet not found — check GOOGLE_SHEETS_SPREADSHEET_ID";
  if (/Unable to parse range/i.test(msg))
    return "Tab not found — check GOOGLE_SHEETS_TAB_NAME";
  return msg.slice(0, 200);
}

export async function GET() {
  if (!sheetsConfigured()) {
    return NextResponse.json({ configured: false, applications: [] });
  }
  try {
    const applications = await readApplications();
    return NextResponse.json({ configured: true, applications });
  } catch (err) {
    console.error("Failed to read from Google Sheets:", err);
    return NextResponse.json(
      { configured: true, applications: [], error: "sheets_read_failed", detail: describe(err) },
      { status: 502 }
    );
  }
}

export async function PUT(request: Request) {
  if (!sheetsConfigured()) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }
  try {
    const body = (await request.json()) as { applications: Application[] };
    await writeApplications(body.applications ?? []);
    return NextResponse.json({ configured: true, ok: true });
  } catch (err) {
    console.error("Failed to write to Google Sheets:", err);
    return NextResponse.json(
      { configured: true, error: "sheets_write_failed", detail: describe(err) },
      { status: 502 }
    );
  }
}

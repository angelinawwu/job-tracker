import { NextResponse } from "next/server";
import {
  readApplications,
  sheetsConfigured,
  writeApplications,
} from "@/lib/sheets";
import type { Application } from "@/lib/types";

export const dynamic = "force-dynamic";

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
      { configured: true, applications: [], error: "sheets_read_failed" },
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
      { configured: true, error: "sheets_write_failed" },
      { status: 502 }
    );
  }
}

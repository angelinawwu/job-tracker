# Job Tracker

A minimal job application tracker built with Next.js. Track companies, roles,
application materials, referrals, notes, and a full status history (Applied →
Interview → Offer, etc.) per application, with an editable table UI.

Data is persisted to a Google Sheet if configured, so you can view and edit it
either from the app or directly in Sheets. If no Google Sheets credentials are
set, the app falls back to browser `localStorage` and works entirely locally.

## Features

- Editable table of applications: company, position, date applied, link,
  application materials, referral/found-via, notes.
- Per-application status history (up to 6 phases), each with a label,
  description, and date — the latest phase is shown as the current status.
- Google Sheets sync as the persistence layer, treating the sheet as the
  source of truth for column layout (matches your existing header names).
- Local-only mode (no setup required) using `localStorage` when Sheets isn't
  configured.
- Link metadata fetching (e.g. to pull a favicon/title for a job posting URL).

## Getting Started

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Google Sheets Setup (optional)

By default the app stores data in your browser's `localStorage`. To sync with
a Google Sheet instead:

1. Create a Google Cloud project: https://console.cloud.google.com
2. Enable the **Google Sheets API** for the project.
3. Create a Service Account (IAM & Admin > Service Accounts) and generate a
   JSON key for it.
4. Create a spreadsheet with a header row, then share it with the service
   account's email (Editor access) — uncheck "Notify people", since service
   accounts have no inbox.
5. Copy `.env.example` to `.env.local` and fill in:
   - `GOOGLE_SHEETS_SPREADSHEET_ID` — the id from the sheet URL
     (`https://docs.google.com/spreadsheets/d/<THIS_PART>/edit`)
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — `client_email` from the JSON key
   - `GOOGLE_PRIVATE_KEY` — `private_key` from the JSON key (keep the `\n`
     escapes, wrap the whole value in double quotes)
   - `GOOGLE_SHEETS_TAB_NAME` — optional, defaults to `Applications`

The header row's columns are matched by name, in any order: `Company`,
`Position Title`, `Date`, `Link`, `App Materials`, `Status`, `Notes`
(`Company Name`, `Found On`/`App Method`, and `Contact` are also recognized).
Status history is stored in `Phase 1` … `Phase 6` columns, oldest first.

Restart the dev server after editing `.env.local`.

## Password Protection (optional)

Set `APP_PASSWORD` (e.g. in Vercel's environment variables) to require a
password. After entering it once, a browser is remembered for a year via an
HTTP-only cookie; changing the password signs everyone out. If
`APP_PASSWORD` is unset, the app is left open (handy for local dev).

## Project Structure

```
src/
  app/
    page.tsx                 # entry point, renders the tracker table
    api/applications/route.ts    # CRUD for applications (Sheets or local)
    api/link-metadata/route.ts   # fetches metadata for a pasted job link
  components/
    TrackerTable.tsx          # main editable table
    cells/                    # per-column cell components (status, date, ...)
    Popover.tsx, Calendar.tsx, DeleteRowButton.tsx
  lib/
    sheets.ts                 # Google Sheets persistence layer
    types.ts                  # Application/StatusPhase types
    useApplications.ts        # data-fetching hook
    tags.ts                   # tag/label helpers
```

## Available Scripts

- `npm run dev` — start the development server
- `npm run build` — build for production
- `npm run start` — run the production build
- `npm run lint` — run ESLint

## Tech Stack

- [Next.js](https://nextjs.org) (App Router)
- React + TypeScript
- Tailwind CSS
- [googleapis](https://www.npmjs.com/package/googleapis) for Sheets access

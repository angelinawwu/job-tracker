import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Fetches a job posting URL and extracts a best-guess company + job title
 * from the page title / OpenGraph tags. Used to autofill row fields when a
 * link is pasted.
 */
export async function POST(request: Request) {
  const { url } = (await request.json()) as { url?: string };
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    const html = await res.text();
    const meta = extract(html, url);
    return NextResponse.json(meta);
  } catch {
    // Fall back to a hostname-based guess so the field isn't left empty.
    return NextResponse.json({ company: hostnameGuess(url), jobTitle: "" });
  }
}

function getMeta(html: string, property: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const reFlip = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    "i"
  );
  return decode(html.match(re)?.[1] ?? html.match(reFlip)?.[1] ?? "");
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function hostnameGuess(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const base = host.split(".")[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return "";
  }
}

function extract(html: string, url: string): { company: string; jobTitle: string } {
  const ogTitle = getMeta(html, "og:title");
  const ogSite = getMeta(html, "og:site_name");
  const titleTag = decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "");
  const title = ogTitle || titleTag;

  let company = "";
  let jobTitle = "";

  // Known job-board patterns
  const linkedin = title.match(/^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+.+)?\s*\|/i);
  const greenhouse = title.match(/^Job Application for\s+(.+?)\s+at\s+(.+)$/i);
  const atPattern = title.match(/^(.+?)\s+at\s+(.+?)(?:\s*[|\u2013\u2014-]\s*.*)?$/i);

  if (linkedin) {
    company = linkedin[1];
    jobTitle = linkedin[2];
  } else if (greenhouse) {
    jobTitle = greenhouse[1];
    company = greenhouse[2];
  } else if (atPattern && atPattern[2].length < 60) {
    jobTitle = atPattern[1];
    company = atPattern[2];
  } else if (title) {
    // Generic "Title - Company" / "Title | Company" splits
    const parts = title.split(/\s*[|\u2013\u2014·-]\s*/).filter(Boolean);
    if (parts.length >= 2) {
      jobTitle = parts[0];
      company = parts[parts.length - 1];
    } else {
      jobTitle = title;
    }
  }

  if (ogSite && !/linkedin|indeed|glassdoor|greenhouse|lever|workday|ashby/i.test(ogSite)) {
    company = ogSite;
  }
  if (!company) company = hostnameGuess(url);

  return { company: company.trim(), jobTitle: jobTitle.trim() };
}

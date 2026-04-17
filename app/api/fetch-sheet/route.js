import { parseSheetUrl, buildCsvExportUrl } from "../../../lib/google-sheets";

// Server-side proxy that fetches a public Google Sheet as CSV.
// Browser can't do this directly (CORS + login redirect on private sheets).
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseSheetUrl(body?.url || "");
  if (!parsed) {
    return Response.json(
      { error: "Couldn't find a Google Sheet ID in that URL. Paste the full sharing link." },
      { status: 400 }
    );
  }

  const csvUrl = buildCsvExportUrl(parsed);

  let res;
  try {
    res = await fetch(csvUrl, { redirect: "follow" });
  } catch (e) {
    return Response.json({ error: "Failed to reach Google Sheets. Try again." }, { status: 502 });
  }

  // Private sheet → Google redirects to a login HTML page (200 OK, text/html).
  const contentType = res.headers.get("content-type") || "";
  const isHtml = contentType.includes("text/html");

  if (!res.ok || isHtml) {
    return Response.json(
      {
        error:
          "Can't access this sheet. Make sure sharing is set to 'Anyone with the link can view', then paste the link again.",
      },
      { status: 403 }
    );
  }

  const text = await res.text();

  if (!text.trim()) {
    return Response.json({ error: "The sheet appears to be empty." }, { status: 400 });
  }

  return Response.json({ csv: text, sheetId: parsed.id, gid: parsed.gid });
}

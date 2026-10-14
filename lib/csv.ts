import "server-only";

/**
 * Builds an Excel-friendly CSV.
 * The UTF-8 BOM makes Excel render Persian text correctly, and the
 * sep= hint keeps column splitting right on Windows locales.
 */
export function buildCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))];
  return `\uFEFF${lines.join("\r\n")}`;
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"; filename*=UTF-8''${encodeURIComponent(filename)}.csv`,
      "Cache-Control": "no-store",
    },
  });
}

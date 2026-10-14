import { eq } from "drizzle-orm";
import { db } from "@/db";
import { uploads } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

  const rows = await db.select().from(uploads).where(eq(uploads.id, id)).limit(1);
  const row = rows[0];
  if (!row) return new Response("Not found", { status: 404 });

  const buffer = Buffer.from(row.data, "base64");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": row.mimeType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { bioLinks } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * Click-counting redirect for bio links.
 * `/go/{linkId}` → increments `clicks` → 302 to actual URL.
 * `rel="noindex"` + `X-Robots-Tag: noindex` keeps Google away.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

  const rows = await db.select({ url: bioLinks.url }).from(bioLinks).where(eq(bioLinks.id, id)).limit(1);
  const link = rows[0];
  if (!link) return new Response("Not found", { status: 404 });

  // fire-and-forget counter
  db.update(bioLinks)
    .set({ clicks: sql`${bioLinks.clicks} + 1` })
    .where(eq(bioLinks.id, id))
    .catch(() => {});

  return NextResponse.redirect(link.url, {
    status: 302,
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}

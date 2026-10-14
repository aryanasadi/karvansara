"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { bioLinks, bioPages, users } from "@/db/schema";
import { getActiveSubscription, getCurrentUser } from "@/lib/auth";
import { slugify } from "@/lib/format";

export type BioResult = { error?: string; message?: string; slug?: string };

const SUB_ERROR = "برای استفاده از این بخش، فعال‌سازی اشتراک لازم است.";
const MAX_LINKS = 20;

async function requireSub() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sub = await getActiveSubscription(user.id);
  if (!sub) return null;
  return user;
}

function touch() {
  revalidatePath("/dashboard/biolink");
}

export async function saveBioPageAction(fd: FormData): Promise<BioResult> {
  const user = await requireSub();
  if (!user) return { error: SUB_ERROR };

  const rawSlug = String(fd.get("slug") ?? "").trim();
  let slug = slugify(rawSlug);
  if (!slug || slug.length < 2) return { error: "نشانی صفحه (slug) حداقل ۲ نویسه باشد." };

  // reserved slugs
  const RESERVED = ["admin", "dashboard", "login", "register", "blog", "api", "t"];
  if (RESERVED.includes(slug)) return { error: "این نشانی رزرو شده و قابل استفاده نیست." };

  // uniqueness
  const clash = await db
    .select({ id: bioPages.id })
    .from(bioPages)
    .where(and(eq(bioPages.slug, slug), ne(bioPages.userId, user.id)))
    .limit(1);
  if (clash.length > 0) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;

  const existing = await db.select().from(bioPages).where(eq(bioPages.userId, user.id)).limit(1);
  const values = {
    slug,
    title: String(fd.get("title") ?? "").trim(),
    bio: String(fd.get("bio") ?? "").trim(),
    theme: ["dark", "light", "brand", "gold"].includes(String(fd.get("theme")))
      ? String(fd.get("theme"))
      : "dark",
    showLogo: fd.get("showLogo") !== "0",
    updatedAt: new Date(),
  };

  if (existing[0]) {
    await db.update(bioPages).set(values).where(eq(bioPages.id, existing[0].id));
  } else {
    await db.insert(bioPages).values({ ...values, userId: user.id });
  }
  touch();
  return { message: "صفحه ذخیره شد.", slug };
}

export async function saveBioLinkAction(fd: FormData): Promise<BioResult> {
  const user = await requireSub();
  if (!user) return { error: SUB_ERROR };

  const bioRow = await db.select().from(bioPages).where(eq(bioPages.userId, user.id)).limit(1);
  if (!bioRow[0]) return { error: "ابتدا صفحه را ذخیره کن." };
  const bioId = bioRow[0].id;

  const label = String(fd.get("label") ?? "").trim();
  const url = String(fd.get("url") ?? "").trim();
  if (!label) return { error: "عنوان لینک خالی است." };
  if (!url) return { error: "نشانی لینک خالی است." };

  const id = String(fd.get("id") ?? "").trim();
  const icon = String(fd.get("icon") ?? "link");
  const sortOrder = Math.max(0, Math.round(Number(fd.get("sortOrder")) || 0));

  if (id) {
    await db
      .update(bioLinks)
      .set({ label, url, icon, sortOrder })
      .where(and(eq(bioLinks.id, id), eq(bioLinks.bioId, bioId)));
  } else {
    const count = await db.select({ id: bioLinks.id }).from(bioLinks).where(eq(bioLinks.bioId, bioId)).limit(MAX_LINKS + 1);
    if (count.length >= MAX_LINKS) return { error: `حداکثر ${MAX_LINKS} لینک مجاز است.` };
    await db.insert(bioLinks).values({ bioId, label, url, icon, sortOrder });
  }
  touch();
  return {};
}

export async function deleteBioLinkAction(id: string): Promise<BioResult> {
  const user = await requireSub();
  if (!user) return { error: SUB_ERROR };
  const bioRow = await db.select({ id: bioPages.id }).from(bioPages).where(eq(bioPages.userId, user.id)).limit(1);
  if (!bioRow[0]) return { error: "صفحه یافت نشد." };
  await db.delete(bioLinks).where(and(eq(bioLinks.id, id), eq(bioLinks.bioId, bioRow[0].id)));
  touch();
  return {};
}

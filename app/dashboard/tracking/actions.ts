"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { parcels, users } from "@/db/schema";
import { getActiveSubscription, getCurrentUser } from "@/lib/auth";
import { siteUrl } from "@/lib/site";

export type TrackingResult = { error?: string; message?: string; link?: string };

const SUB_ERROR = "برای استفاده از این بخش، فعال‌سازی اشتراک لازم است.";
const MAX_PARCELS = 200;

async function requireSub() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sub = await getActiveSubscription(user.id);
  if (!sub) return null;
  return user;
}

function touch() {
  revalidatePath("/dashboard/tracking");
}

export async function addParcelAction(fd: FormData): Promise<TrackingResult> {
  const user = await requireSub();
  if (!user) return { error: SUB_ERROR };

  const code = String(fd.get("code") ?? "").trim().replace(/\s/g, "");
  if (!code || code.length < 4) return { error: "بارکد پستی حداقل ۴ رقم باشد." };

  // limit per user
  const count = await db.select({ id: parcels.id }).from(parcels).where(eq(parcels.userId, user.id)).limit(MAX_PARCELS + 1);
  if (count.length >= MAX_PARCELS) return { error: `حداکثر ${MAX_PARCELS} بارکد ثبت‌شده مجاز است. بارکدهای قدیمی را حذف کن.` };

  const profile = await db.select({ businessName: users.businessName, logoUrl: users.logoUrl }).from(users).where(eq(users.id, user.id)).limit(1);

  await db.insert(parcels).values({
    userId: user.id,
    code,
    customerName: String(fd.get("customerName") ?? "").trim(),
    customerPhone: String(fd.get("customerPhone") ?? "").trim(),
    carrier: String(fd.get("carrier") ?? "post"),
    note: String(fd.get("note") ?? "").trim(),
  });
  touch();

  const publicLink = `${siteUrl()}/t/${encodeURIComponent(code)}`;
  return { message: `بارکد ثبت شد.`, link: publicLink };
}

export async function deleteParcelAction(id: string): Promise<TrackingResult> {
  const user = await requireSub();
  if (!user) return { error: SUB_ERROR };
  await db.delete(parcels).where(and(eq(parcels.id, id), eq(parcels.userId, user.id)));
  touch();
  return {};
}

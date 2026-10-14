"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { reminders } from "@/db/schema";
import { getActiveSubscription, getCurrentUser } from "@/lib/auth";

export type ReminderResult = { error?: string; message?: string };

const SUB_ERROR = "برای استفاده از این بخش، فعال‌سازی اشتراک لازم است.";

async function requireSub() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sub = await getActiveSubscription(user.id);
  if (!sub) return null;
  return user;
}

function touch() {
  revalidatePath("/dashboard", "layout");
}

function faEn(s: string) {
  return s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

export async function saveReminderAction(fd: FormData): Promise<ReminderResult> {
  const user = await requireSub();
  if (!user) return { error: SUB_ERROR };

  const title = String(fd.get("title") ?? "").trim();
  const dueRaw = String(fd.get("dueDate") ?? "").trim();
  if (!title) return { error: "عنوان یادآوری را بنویس." };
  if (!dueRaw) return { error: "تاریخ سررسید را انتخاب کن." };
  const dueDate = new Date(dueRaw);
  if (Number.isNaN(dueDate.getTime())) return { error: "تاریخ سررسید معتبر نیست." };

  const amount = Math.max(0, Math.round(Number(faEn(String(fd.get("amount") ?? "")).replace(/[^\d]/g, "")) || 0));
  const type = String(fd.get("type") ?? "other");
  const id = String(fd.get("id") ?? "").trim();

  const values = { title, type, amount, dueDate, note: String(fd.get("note") ?? "").trim() };
  if (id) {
    await db.update(reminders).set(values).where(and(eq(reminders.id, id), eq(reminders.userId, user.id)));
  } else {
    await db.insert(reminders).values({ ...values, userId: user.id });
  }
  touch();
  return {};
}

export async function toggleReminderAction(id: string): Promise<ReminderResult> {
  const user = await requireSub();
  if (!user) return { error: SUB_ERROR };
  const rows = await db
    .select({ isDone: reminders.isDone })
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, user.id)))
    .limit(1);
  if (!rows[0]) return { error: "یادآوری یافت نشد." };
  await db.update(reminders).set({ isDone: !rows[0].isDone }).where(eq(reminders.id, id));
  touch();
  return {};
}

export async function deleteReminderAction(id: string): Promise<ReminderResult> {
  const user = await requireSub();
  if (!user) return { error: SUB_ERROR };
  await db.delete(reminders).where(and(eq(reminders.id, id), eq(reminders.userId, user.id)));
  touch();
  return {};
}

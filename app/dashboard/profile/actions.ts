"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { storeImage } from "@/lib/uploads";
import { isValidPhone, normalizePhone } from "@/lib/sms";

export type ProfileResult = { error?: string; message?: string; logoUrl?: string };

function touch() {
  revalidatePath("/dashboard", "layout");
}

export async function updateProfileAction(fd: FormData): Promise<ProfileResult> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (name.length < 2) return { error: "نام و نام خانوادگی را کامل وارد کن." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "نشانی ایمیل معتبر نیست." };

  const phoneRaw = String(fd.get("phone") ?? "").trim();
  const phone = phoneRaw ? normalizePhone(phoneRaw) : "";
  if (phone && !isValidPhone(phone)) return { error: "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود." };

  const taken = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, current.id)))
    .limit(1);
  if (taken.length > 0) return { error: "این ایمیل قبلاً برای حساب دیگری ثبت شده است." };

  await db
    .update(users)
    .set({
      name,
      email,
      phone,
      businessName: String(fd.get("businessName") ?? "").trim(),
      address: String(fd.get("address") ?? "").trim(),
    })
    .where(eq(users.id, current.id));

  touch();
  return { message: "اطلاعات پروفایل ذخیره شد." };
}

export async function updateLogoAction(fd: FormData): Promise<ProfileResult> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  const file = fd.get("file");
  if (!(file instanceof File)) return { error: "فایلی انتخاب نشده است." };

  const res = await storeImage(current.id, file);
  if (res.error || !res.url) return { error: res.error ?? "بارگذاری ناموفق بود." };

  await db.update(users).set({ logoUrl: res.url }).where(eq(users.id, current.id));
  touch();
  return { message: "لوگوی کسب‌وکار به‌روزرسانی شد.", logoUrl: res.url };
}

export async function removeLogoAction(): Promise<ProfileResult> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  await db.update(users).set({ logoUrl: "" }).where(eq(users.id, current.id));
  touch();
  return { message: "لوگو حذف شد." };
}

export async function changePasswordAction(fd: FormData): Promise<ProfileResult> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const currentPassword = String(fd.get("currentPassword") ?? "");
  const newPassword = String(fd.get("newPassword") ?? "");
  if (newPassword.length < 6) return { error: "گذرواژه تازه باید حداقل ۶ نویسه باشد." };

  const rows = await db.select().from(users).where(eq(users.id, current.id)).limit(1);
  const row = rows[0];
  if (!row) return { error: "حساب یافت نشد." };
  if (!verifyPassword(currentPassword, row.passwordHash)) return { error: "گذرواژه فعلی نادرست است." };

  await db.update(users).set({ passwordHash: hashPassword(newPassword) }).where(eq(users.id, current.id));
  return { message: "گذرواژه با موفقیت تغییر کرد." };
}
